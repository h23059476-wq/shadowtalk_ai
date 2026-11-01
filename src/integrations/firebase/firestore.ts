/**
 * Firestore → PostgREST-style query builder.
 *
 * Supports the subset of the Supabase query API the app uses:
 *   select / insert / update / upsert / delete
 *   eq neq gt gte lt lte in is like ilike contains match filter or not
 *   order limit range single maybeSingle count
 *   onSnapshot (realtime listener with Supabase-style filter spec)
 *
 * Anything Firestore can't express server-side is applied in memory after the
 * fetch, so call sites behave the same.
 *
 * Resilience:
 * - Queries on a field named "id" are translated to the Firestore document ID
 *   (FieldPath.documentId()), so .update().eq('id', x) actually matches docs.
 * - "failed-precondition" (missing composite index) errors are retried with
 *   equality-only server constraints plus in-memory filter/sort, instead of
 *   hard-failing the feature.
 * - onSnapshot listeners fall back to a one-shot fetch + 30s poll when the
 *   realtime query would require a missing index.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  limit as fsLimit,
  onSnapshot as fsOnSnapshot,
  orderBy as fsOrderBy,
  query as fsQuery,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { fbDb } from './app';

type Row = Record<string, any>;
type Op =
  | { kind: 'where'; field: string; op: string; value: any }
  | { kind: 'order'; field: string; ascending: boolean }
  | { kind: 'limit'; value: number };

interface Result<T = any> {
  data: T;
  error: Error | null;
  count: number | null;
  status: number;
  statusText: string;
}

const ok = <T,>(data: T, count: number | null = null): Result<T> => ({
  data,
  error: null,
  count,
  status: 200,
  statusText: 'OK',
});
const fail = (error: Error): Result<null> => ({
  data: null,
  error,
  count: null,
  status: 400,
  statusText: 'Bad Request',
});

function normalize(id: string, data: Row): Row {
  const out: Row = { id, ...data };
  for (const [k, v] of Object.entries(out)) {
    if (v && typeof v === 'object' && typeof (v as any).toDate === 'function') {
      out[k] = (v as any).toDate().toISOString();
    }
  }
  return out;
}

/** Firestore-native operators; everything else is filtered in memory. */
const FS_OPS: Record<string, any> = {
  eq: '==',
  '==': '==',
  neq: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  in: 'in',
  contains: 'array-contains-any',
};

function matchesLocal(row: Row, op: Op & { kind: 'where' }): boolean {
  const val = row[op.field];
  switch (op.op) {
    case 'eq':
    case '==':
      return val === op.value;
    case 'neq':
      return val !== op.value;
    case 'gt':
      return val > op.value;
    case 'gte':
      return val >= op.value;
    case 'lt':
      return val < op.value;
    case 'lte':
      return val <= op.value;
    case 'in':
      return Array.isArray(op.value) && op.value.includes(val);
    case 'is':
      return op.value === null ? val == null : val === op.value;
    case 'like':
    case 'ilike': {
      const pattern = String(op.value).replace(/%/g, '.*').replace(/_/g, '.');
      return new RegExp(`^${pattern}$`, op.op === 'ilike' ? 'i' : '').test(String(val ?? ''));
    }
    case 'contains': {
      const needles = Array.isArray(op.value) ? op.value : [op.value];
      if (Array.isArray(val)) return needles.some((n) => val.includes(n));
      if (val && typeof val === 'object')
        return Object.entries(op.value ?? {}).every(([k, v]) => (val as Row)[k] === v);
      return false;
    }
    default:
      return true;
  }
}

/** Only missing-composite-index errors are safe to retry in memory. */
function isIndexError(err: any): boolean {
  return (
    err?.code === 'failed-precondition' &&
    typeof err?.message === 'string' &&
    /index/i.test(err.message)
  );
}

/**
 * Recursively strip `undefined` values — Firestore rejects documents that
 * contain them anywhere (e.g. `setting_value: { preferredMode: undefined }`).
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((v) => v !== undefined)
      .map((v) => stripUndefined(v)) as unknown as T;
  }
  if (value && typeof value === 'object' && typeof (value as any).toDate !== 'function') {
    const out: Row = {};
    for (const [k, v] of Object.entries(value as Row)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as unknown as T;
  }
  return value;
}

/** Supabase-style filter spec → flat where ops. */
function parseFilterSpec(filter: any): (Op & { kind: 'where' })[] {
  if (!filter) return [];
  if (Array.isArray(filter.and))
    return filter.and
      .filter(Boolean)
      .map((c: any) => ({ kind: 'where', field: c.field, op: c.op || '==', value: c.value }));
  if (filter.or && Array.isArray(filter.or)) {
    // `or` is not expressible server-side; treat each clause as an in-memory filter.
    return filter.or
      .filter(Boolean)
      .map((c: any) => ({ kind: 'where', field: c.field, op: c.op || '==', value: c.value }));
  }
  if (filter.field)
    return [{ kind: 'where', field: filter.field, op: filter.op || '==', value: filter.value }];
  return [];
}

class FirestoreQuery<T = any> implements PromiseLike<Result<any>> {
  private ops: Op[] = [];
  private mode: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: Row | Row[] | null = null;
  private singleMode: 'none' | 'single' | 'maybe' = 'none';
  private countOnly = false;
  private conflictKeys: string[] = ['id'];
  private rangeSpec: { from: number; to: number } | null = null;

  constructor(private table: string) {}

  // ---- terminal-ish builders -------------------------------------------
  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.mode === 'select') this.mode = 'select';
    if (opts?.count && opts?.head) this.countOnly = true;
    return this;
  }
  insert(values: Row | Row[]) {
    this.mode = 'insert';
    this.payload = values;
    return this;
  }
  upsert(values: Row | Row[], opts?: { onConflict?: string }) {
    this.mode = 'upsert';
    this.payload = values;
    this.conflictKeys = (opts?.onConflict || 'id')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    if (this.conflictKeys.length === 0) this.conflictKeys = ['id'];
    return this;
  }
  update(values: Row) {
    this.mode = 'update';
    this.payload = values;
    return this;
  }
  delete() {
    this.mode = 'delete';
    return this;
  }

  // ---- filters ---------------------------------------------------------
  private push(field: string, op: string, value: any) {
    this.ops.push({ kind: 'where', field, op, value });
    return this;
  }
  eq(f: string, v: any) { return this.push(f, 'eq', v); }
  neq(f: string, v: any) { return this.push(f, 'neq', v); }
  gt(f: string, v: any) { return this.push(f, 'gt', v); }
  gte(f: string, v: any) { return this.push(f, 'gte', v); }
  lt(f: string, v: any) { return this.push(f, 'lt', v); }
  lte(f: string, v: any) { return this.push(f, 'lte', v); }
  in(f: string, v: any[]) { return this.push(f, 'in', v); }
  is(f: string, v: any) { return this.push(f, 'is', v); }
  like(f: string, v: string) { return this.push(f, 'like', v); }
  ilike(f: string, v: string) { return this.push(f, 'ilike', v); }
  contains(f: string, v: any) { return this.push(f, 'contains', v); }
  match(obj: Row) {
    for (const [k, v] of Object.entries(obj)) this.push(k, 'eq', v);
    return this;
  }
  filter(f: string, op: string, v: any) {
    return this.push(f, op.replace(/^(eq|neq|gt|gte|lt|lte|in|is|like|ilike|cs)$/, (m) => (m === 'cs' ? 'contains' : m)), v);
  }
  not(f: string, op: string, v: any) {
    return this.push(f, op === 'is' ? 'neq' : 'neq', v);
  }
  /** `or()` is not expressible in Firestore — treated as no filter. */
  or(_expr: string) { return this; }
  order(field: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.ops.push({ kind: 'order', field, ascending: opts?.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.ops.push({ kind: 'limit', value: n });
    return this;
  }
  range(from: number, to: number) {
    this.rangeSpec = { from, to };
    return this;
  }
  single() {
    this.singleMode = 'single';
    return this;
  }
  maybeSingle() {
    this.singleMode = 'maybe';
    return this;
  }
  throwOnError() { return this; }
  abortSignal(_s?: AbortSignal) { return this; }
  returns() { return this; }
  csv() { return this; }

  // ---- realtime --------------------------------------------------------
  /**
   * Supabase-shaped realtime subscription:
   *   .onSnapshot({ filter: { field, op, value } | { and: [...] } }, onNext, onError)
   *     onNext receives { docs: [{ id, data }] }
   *   returns { unsubscribe }
   * Falls back to a one-shot fetch + 30s poll when the realtime query hits a
   * missing composite index.
   */
  onSnapshot(
    options: any,
    onNext: (snapshot: { docs: { id: string; data: Row }[] }) => void,
    onError?: (error: Error) => void,
  ): { unsubscribe: () => void } {
    const wheres = parseFilterSpec(options?.filter);
    const orderOps = options?.orderBy
      ? [{ field: String(options.orderBy), ascending: options?.ascending !== false }]
      : [];
    const lim = typeof options?.limit === 'number' ? options.limit : undefined;

    let unsub: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const emit = (rows: Row[]) => {
      if (cancelled) return;
      onNext({ docs: rows.map((r) => ({ id: r.id, data: r })) } as any);
    };

    const deliverLocalOnce = async () => {
      try {
        const probe = new FirestoreQuery(this.table);
        for (const w of wheres) probe.push(w.field, w.op, w.value);
        for (const o of orderOps) probe.order(o.field, { ascending: o.ascending });
        if (lim) probe.limit(lim);
        const res = await probe.runSelect();
        emit(Array.isArray(res.data) ? res.data : res.data ? [res.data] : []);
      } catch (err) {
        if (!cancelled) onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    const startPolling = () => {
      if (cancelled || pollTimer) return;
      pollTimer = setInterval(() => void deliverLocalOnce(), 30_000);
    };

    try {
      const constraints: QueryConstraint[] = [];
      for (const w of wheres) {
        if (w.field === 'id') {
          constraints.push(
            w.op === 'eq' || w.op === '=='
              ? where(documentId(), '==', w.value)
              : where(documentId(), 'in', Array.isArray(w.value) ? w.value : [w.value]),
          );
          continue;
        }
        const fsOp = FS_OPS[w.op];
        if (!fsOp || w.value === undefined) continue;
        constraints.push(
          where(w.field, fsOp, w.op === 'contains' && !Array.isArray(w.value) ? [w.value] : w.value),
        );
      }
      for (const o of orderOps) constraints.push(fsOrderBy(o.field, o.ascending ? 'asc' : 'desc'));
      if (lim) constraints.push(fsLimit(lim));

      unsub = fsOnSnapshot(
        fsQuery(collection(fbDb(), this.table), ...constraints),
        (snap) => {
          emit(snap.docs.map((d) => normalize(d.id, d.data() as Row)));
        },
        (err: any) => {
          if (cancelled) return;
          console.warn(`[firestore:${this.table}:onSnapshot]`, err?.code || err?.message || err);
          if (isIndexError(err)) {
            // Missing composite index — approximate realtime with a fetch + poll.
            void deliverLocalOnce().then(startPolling);
          } else {
            onError?.(err instanceof Error ? err : new Error(String(err)));
          }
        },
      );
    } catch (err: any) {
      console.warn(`[firestore:${this.table}:onSnapshot:setup]`, err?.message || err);
      void deliverLocalOnce().then(startPolling);
    }

    return {
      unsubscribe: () => {
        cancelled = true;
        try { unsub?.(); } catch { /* already torn down */ }
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      },
    };
  }

  // ---- execution -------------------------------------------------------
  /**
   * Build server-side constraints.
   * eqOnly=true strips inequalities/orders (missing-index retry path) — those
   * are then applied in memory by the caller.
   */
  private planServer(wheres: (Op & { kind: 'where' })[], orders: (Op & { kind: 'order' })[], eqOnly: boolean) {
    const constraints: QueryConstraint[] = [];
    let inequalityField: string | null = null;

    for (const w of wheres) {
      if (w.field === 'id') {
        // "id" maps to the Firestore document ID — equality/in filters are
        // always index-supported, even in the eqOnly retry path.
        if (w.op === 'eq' || w.op === '==') {
          constraints.push(where(documentId(), '==', w.value));
        } else if (w.op === 'in' && Array.isArray(w.value)) {
          constraints.push(where(documentId(), 'in', w.value));
        }
        continue;
      }
      const fsOp = FS_OPS[w.op];
      const isInequality = ['gt', 'gte', 'lt', 'lte', 'neq'].includes(w.op);
      if (!fsOp || w.value === undefined || (eqOnly && w.op !== 'eq')) continue;
      if (isInequality && inequalityField && inequalityField !== w.field) continue;
      if (isInequality) inequalityField = w.field;
      constraints.push(
        where(w.field, fsOp, w.op === 'contains' && !Array.isArray(w.value) ? [w.value] : w.value),
      );
    }

    const canOrderServerSide =
      !eqOnly && orders.length > 0 && (!inequalityField || inequalityField === orders[0].field);
    if (canOrderServerSide) {
      for (const o of orders) constraints.push(fsOrderBy(o.field, o.ascending ? 'asc' : 'desc'));
    }
    return { constraints, canOrderServerSide };
  }

  private async runSelect(): Promise<Result<any>> {
    const wheres = this.ops.filter((o) => o.kind === 'where') as (Op & { kind: 'where' })[];
    const orders = this.ops.filter((o) => o.kind === 'order') as (Op & { kind: 'order' })[];
    const lim = (this.ops.find((o) => o.kind === 'limit') as any)?.value as number | undefined;

    const ref = collection(fbDb(), this.table);

    if (this.countOnly) {
      const { constraints } = this.planServer(wheres, orders, false);
      const snap = await getCountFromServer(fsQuery(ref, ...constraints));
      return ok([], snap.data().count);
    }

    let rows: Row[] = [];
    let orderedServerSide = false;

    // Single-document GET path: a query filtered by eq('id', v) maps to a
    // direct getDoc. This matters for security rules — per-user rules that
    // check resource.data.user_id are verifiable for GETs (document-level)
    // but NOT for LIST queries that only constrain the document ID.
    const idEqs = wheres.filter(
      (w) => w.field === 'id' && (w.op === 'eq' || w.op === '==') && typeof w.value === 'string',
    );
    if (idEqs.length === 1) {
      const snap = await getDoc(doc(fbDb(), this.table, idEqs[0].value));
      if (snap.exists()) rows = [normalize(snap.id, snap.data() as Row)];
    } else {
      try {
        const { constraints, canOrderServerSide } = this.planServer(wheres, orders, false);
        // A server-side limit is only safe when ordering happens server-side
        // (or there is no ordering at all) — otherwise it cuts rows before the
        // local sort.
        if (lim && (canOrderServerSide || orders.length === 0)) constraints.push(fsLimit(lim));
        const snap = await getDocs(fsQuery(ref, ...constraints));
        rows = snap.docs.map((d) => normalize(d.id, d.data() as Row));
        orderedServerSide = canOrderServerSide;
      } catch (err: any) {
        if (!isIndexError(err)) throw err;
        // Missing composite index — retry with equality-only server constraints
        // and finish filter/sort/limit in memory.
        console.warn(`[firestore:${this.table}] index missing, falling back to in-memory query`);
        const { constraints } = this.planServer(wheres, orders, true);
        const snap = await getDocs(fsQuery(ref, ...constraints));
        rows = snap.docs.map((d) => normalize(d.id, d.data() as Row));
        orderedServerSide = false;
      }
    }

    // Re-apply every where locally — idempotent for server-applied constraints
    // and correct for the eqOnly fallback / locally-handled operators.
    for (const w of wheres) rows = rows.filter((r) => matchesLocal(r, w));

    if (!orderedServerSide) {
      for (const o of [...orders].reverse()) {
        rows.sort((a, b) => {
          const av = a[o.field];
          const bv = b[o.field];
          if (av === bv) return 0;
          const cmp = av > bv || av == null ? 1 : -1;
          return o.ascending ? cmp : -cmp;
        });
      }
    }

    const total = rows.length;
    if (this.rangeSpec) rows = rows.slice(this.rangeSpec.from, this.rangeSpec.to + 1);
    else if (lim) rows = rows.slice(0, lim);

    if (this.singleMode !== 'none') {
      if (rows.length === 0) {
        if (this.singleMode === 'maybe') return ok(null, 0);
        const e = new Error('No rows found');
        (e as any).code = 'PGRST116';
        return fail(e);
      }
      return ok(rows[0], total);
    }
    return ok(rows, total);
  }

  private async runInsert(): Promise<Result<any>> {
    const values = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map(stripUndefined);
    const written: Row[] = [];
    for (const v of values) {
      const body = { created_at: serverTimestamp(), ...v };
      if (v?.id) {
        await setDoc(doc(fbDb(), this.table, String(v.id)), body as any, { merge: false });
        // Include created_at as ISO string so callers have a usable timestamp
        written.push({ ...v, id: String(v.id), created_at: new Date().toISOString() });
      } else {
        const ref = await addDoc(collection(fbDb(), this.table), body as any);
        written.push({ ...v, id: ref.id, created_at: new Date().toISOString() });
      }
    }
    const data = this.singleMode !== 'none' ? written[0] ?? null : written;
    return ok(data, written.length);
  }

  private async runUpsert(): Promise<Result<any>> {
    const values = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map(stripUndefined);
    const written: Row[] = [];
    for (const v of values) {
      // Single "id" conflict key → write straight to the document.
      const idVal = v?.id != null ? String(v.id) : null;
      if (this.conflictKeys.length === 1 && this.conflictKeys[0] === 'id' && idVal) {
        await setDoc(doc(fbDb(), this.table, idVal), { updated_at: serverTimestamp(), ...v } as any, {
          merge: true,
        });
        written.push({ ...v, id: idVal });
        continue;
      }
      // Composite / non-id conflict keys → match on ALL key columns, so
      // onConflict: 'user_id,setting_key' doesn't collapse onto user_id alone.
      const keyPairs = this.conflictKeys
        .map((k) => [k, v?.[k]] as const)
        .filter(([, val]) => val != null);
      if (keyPairs.length === this.conflictKeys.length && keyPairs.length > 0) {
        const snap = await getDocs(
          fsQuery(
            collection(fbDb(), this.table),
            ...keyPairs.map(([k, val]) => where(k, '==', val as any)),
            fsLimit(1),
          ),
        );
        if (!snap.empty) {
          await setDoc(snap.docs[0].ref, { updated_at: serverTimestamp(), ...v } as any, {
            merge: true,
          });
          written.push({ ...v, id: snap.docs[0].id });
          continue;
        }
      }
      const ref = await addDoc(collection(fbDb(), this.table), {
        created_at: serverTimestamp(),
        ...v,
      } as any);
      written.push({ ...v, id: ref.id });
    }
    const data = this.singleMode !== 'none' ? written[0] ?? null : written;
    return ok(data, written.length);
  }

  private async matchingDocs() {
    const probe = new FirestoreQuery(this.table);
    probe.ops = this.ops.filter((o) => o.kind !== 'limit');
    const res = await probe.runSelect();
    const rows = Array.isArray(res.data) ? res.data : res.data ? [res.data] : [];
    return rows as Row[];
  }

  private async runUpdate(): Promise<Result<any>> {
    const rows = await this.matchingDocs();
    // Echo equality-filter columns into the payload (when absent) so that
    // security rules requiring e.g. request.resource.data.user_id still pass.
    const payload = stripUndefined({ ...(this.payload as Row) });
    for (const o of this.ops) {
      if (o.kind !== 'where' || o.field === 'id' || o.op !== 'eq') continue;
      if (o.value !== undefined && payload[o.field] === undefined) payload[o.field] = o.value;
    }
    const updated: Row[] = [];
    for (const r of rows) {
      await updateDoc(doc(fbDb(), this.table, String(r.id)), {
        updated_at: serverTimestamp(),
        ...payload,
      } as any);
      updated.push({ ...r, ...payload });
    }
    const data = this.singleMode !== 'none' ? updated[0] ?? null : updated;
    return ok(data, updated.length);
  }

  private async runDelete(): Promise<Result<any>> {
    const rows = await this.matchingDocs();
    for (const r of rows) await deleteDoc(doc(fbDb(), this.table, String(r.id)));
    const data = this.singleMode !== 'none' ? rows[0] ?? null : rows;
    return ok(data, rows.length);
  }

  private async execute(): Promise<Result<any>> {
    try {
      switch (this.mode) {
        case 'insert':
          return await this.runInsert();
        case 'upsert':
          return await this.runUpsert();
        case 'update':
          return await this.runUpdate();
        case 'delete':
          return await this.runDelete();
        default:
          return await this.runSelect();
      }
    } catch (err: any) {
      console.warn(`[firestore:${this.table}:${this.mode}]`, err?.code || err?.message || err, err?.message ?? '');
      return fail(err instanceof Error ? err : new Error(String(err)));
    }
  }

  then<TResult1 = Result<any>, TResult2 = never>(
    onfulfilled?: ((value: Result<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
  catch(onrejected?: (reason: any) => any) {
    return this.execute().catch(onrejected);
  }
  finally(cb?: () => void) {
    return this.execute().finally(cb);
  }
}

export function createFirestoreFrom() {
  return (table: string) => new FirestoreQuery(table) as any;
}

/** Read a single document by id (used by helpers that need direct access). */
export async function getDocumentById(table: string, id: string) {
  const snap = await getDoc(doc(fbDb(), table, id));
  return snap.exists() ? normalize(snap.id, snap.data() as Row) : null;
}

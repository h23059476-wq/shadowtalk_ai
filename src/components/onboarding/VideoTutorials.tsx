import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  Circle,
  Sparkles,
  MessageSquare,
  Image,
  Code,
  Search,
  Mic,
  Lock,
  Crown,
  Rocket,
  ArrowRight,
  X,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: React.ElementType;
  videoUrl?: string;
  steps: string[];
  completed: boolean;
  isPro?: boolean;
}

interface VideoTutorialsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TUTORIALS: Tutorial[] = [
  {
    id: "getting-started",
    title: "Getting Started with ShadowTalk",
    description: "Learn the basics of AI-powered conversations",
    duration: "2:30",
    icon: MessageSquare,
    steps: [
      "Type your message in the chat input",
      "Press Enter or click Send to get AI response",
      "Use @ to mention specific modes or features",
      "Click the microphone for voice input",
    ],
    completed: false,
  },
  {
    id: "ai-modes",
    title: "Mastering AI Modes",
    description: "Explore different AI personalities and modes",
    duration: "3:15",
    icon: Sparkles,
    steps: [
      "Click the mode selector at the top",
      "Choose from Standard, Advanced, or Pro modes",
      "Each mode has unique capabilities",
      "Pro mode includes deep research and analysis",
    ],
    completed: false,
  },
  {
    id: "image-generation",
    title: "AI Image Generation",
    description: "Create stunning images with AI",
    duration: "2:45",
    icon: Image,
    steps: [
      "Click the image icon in the toolbar",
      "Describe the image you want to create",
      "Choose style and dimensions",
      "Download or share your creation",
    ],
    completed: false,
    isPro: true,
  },
  {
    id: "code-canvas",
    title: "Code Canvas & Playground",
    description: "Write, run, and debug code with AI assistance",
    duration: "4:00",
    icon: Code,
    steps: [
      "Open Code Canvas from the toolbar",
      "Write code in any supported language",
      "Get AI suggestions and completions",
      "Run code directly in the playground",
    ],
    completed: false,
    isPro: true,
  },
  {
    id: "deep-research",
    title: "Deep Research Mode",
    description: "Comprehensive research with citations",
    duration: "3:30",
    icon: Search,
    steps: [
      "Enable Deep Research from advanced features",
      "Enter your research topic",
      "AI searches multiple sources",
      "Get comprehensive report with citations",
    ],
    completed: false,
    isPro: true,
  },
  {
    id: "voice-features",
    title: "Voice Conversations",
    description: "Talk to AI naturally with voice",
    duration: "2:00",
    icon: Mic,
    steps: [
      "Click the microphone button",
      "Speak your message clearly",
      "AI transcribes and responds",
      "Enable text-to-speech for audio responses",
    ],
    completed: false,
  },
];

export function VideoTutorials({ open, onOpenChange }: VideoTutorialsProps) {
  const { userPlan } = useAuth();
  const [currentTutorial, setCurrentTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [completedTutorials, setCompletedTutorials] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load completed tutorials from localStorage
    const saved = localStorage.getItem('shadowtalk_completed_tutorials');
    if (saved) {
      setCompletedTutorials(new Set(JSON.parse(saved)));
    }
  }, []);

  const saveTutorialProgress = (tutorialId: string) => {
    const updated = new Set(completedTutorials).add(tutorialId);
    setCompletedTutorials(updated);
    localStorage.setItem('shadowtalk_completed_tutorials', JSON.stringify([...updated]));
  };

  const startTutorial = (tutorial: Tutorial) => {
    // FREE ACCESS TRANSITION: all tutorials are unlocked for everyone.
    void userPlan;
    setCurrentTutorial(tutorial);
    setCurrentStep(0);
    setPlaying(true);
  };

  const nextStep = () => {
    if (currentTutorial && currentStep < currentTutorial.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tutorial complete
      if (currentTutorial) {
        saveTutorialProgress(currentTutorial.id);
      }
      setCurrentTutorial(null);
      setCurrentStep(0);
      setPlaying(false);
    }
  };

  const progress = (completedTutorials.size / TUTORIALS.length) * 100;
  const isProUser = true; // Free access: tutorials are never locked.

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Video Tutorials
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {currentTutorial ? (
            <motion.div
              key="tutorial-player"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Tutorial Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <currentTutorial.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{currentTutorial.title}</h3>
                    <p className="text-sm text-muted-foreground">{currentTutorial.description}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setCurrentTutorial(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Video Placeholder / Animation */}
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center relative overflow-hidden">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-center space-y-4"
                >
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                    {playing ? (
                      <Pause className="h-10 w-10 text-primary" />
                    ) : (
                      <Play className="h-10 w-10 text-primary ml-1" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Interactive Tutorial
                  </p>
                </motion.div>
                
                {/* Step indicator */}
                <div className="absolute bottom-4 left-4 right-4">
                  <Progress 
                    value={((currentStep + 1) / currentTutorial.steps.length) * 100} 
                    className="h-1"
                  />
                </div>
              </div>

              {/* Current Step */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">{currentStep + 1}/{currentTutorial.steps.length}</Badge>
                    <p className="flex-1">{currentTutorial.steps[currentStep]}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                  disabled={currentStep === 0}
                >
                  Previous
                </Button>
                <Button onClick={nextStep} className="gap-2">
                  {currentStep === currentTutorial.steps.length - 1 ? (
                    <>Complete <CheckCircle2 className="h-4 w-4" /></>
                  ) : (
                    <>Next <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="tutorial-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Progress Overview */}
              <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Your Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {completedTutorials.size} / {TUTORIALS.length} completed
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </CardContent>
              </Card>

              {/* Tutorial List */}
              <div className="grid gap-3">
                {TUTORIALS.map((tutorial) => {
                  const isCompleted = completedTutorials.has(tutorial.id);
                  const isLocked = tutorial.isPro && !isProUser;

                  return (
                    <Card 
                      key={tutorial.id}
                      className={`transition-all hover:shadow-md cursor-pointer ${
                        isLocked ? 'opacity-75' : ''
                      } ${isCompleted ? 'bg-success/5 border-success/20' : ''}`}
                      onClick={() => !isLocked && startTutorial(tutorial)}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${
                            isCompleted ? 'bg-success/10' : 'bg-primary/10'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            ) : isLocked ? (
                              <Lock className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <tutorial.icon className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold truncate">{tutorial.title}</h4>
                              {tutorial.isPro && (
                                <Badge variant="secondary" className="gap-1 shrink-0">
                                  <Crown className="h-3 w-3" />
                                  Pro
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {tutorial.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline">{tutorial.duration}</Badge>
                            {!isLocked && !isCompleted && (
                              <Play className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pro Upgrade CTA */}
              {!isProUser && (
                <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Crown className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Unlock all tutorials</p>
                          <p className="text-sm text-muted-foreground">
                            Upgrade to Pro for full access
                          </p>
                        </div>
                      </div>
                      <Button size="sm">Upgrade</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

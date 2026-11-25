import React from "react";
import { Composition } from "remotion";
import { CampaignShort, defaultCampaignProps } from "./CampaignShort";
import { DURATION_FRAMES, FPS, HEIGHT, WIDTH } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* vertical marketing short for the n8n pipeline — 1080x1920 @30fps, 30s */}
      <Composition
        id="CampaignShort"
        component={CampaignShort}
        defaultProps={defaultCampaignProps}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};

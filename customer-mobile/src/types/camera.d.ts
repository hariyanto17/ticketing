declare module "react-native-camera-kit" {
  import { Component } from "react";
  import { ViewProps } from "react-native";

  export enum CameraType {
    Back = "back",
    Front = "front",
  }

  export enum TorchMode {
    Off = "off",
    On = "on",
  }

  export interface CameraProps extends ViewProps {
    cameraType?: CameraType | string;
    torchMode?: TorchMode | "on" | "off";
    scanBarcode?: boolean;
    showFrame?: boolean;
    laserColor?: string;
    frameColor?: string;
    surfaceColor?: string;
    onReadCode?: (event: { nativeEvent: { codeStringValue: string } }) => void;
    ratioOverlay?: string;
    ratioOverlayColor?: string;
    resetFocusTimeout?: number;
    resetFocusWhenMotionDetected?: boolean;
  }

  export class Camera extends Component<CameraProps> {
    capture?: (options?: any) => Promise<any>;
    checkDeviceCameraAuthorizationStatus?: () => Promise<boolean>;
    requestDeviceCameraAuthorization?: () => Promise<boolean>;
  }
}

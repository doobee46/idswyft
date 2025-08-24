// Type declarations for opencv4nodejs
declare module 'opencv4nodejs' {
  export interface Point {
    x: number;
    y: number;
  }

  export interface Size {
    width: number;
    height: number;
  }

  export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface Scalar {
    w: number;
    x: number;
    y: number;
    z: number;
    [index: number]: number; // Allow array-like access
  }

  export interface DetectionResult {
    objects: Rect[];
    numDetections: number[];
  }

  export interface Mat {
    rows: number;
    cols: number;
    type: number;
    channels: number;
    depth: number;
    size: Size;
    
    // Mat methods
    gaussianBlur(ksize: Size, sigmaX: number, sigmaY?: number): Mat;
    getRegion(rect: Rect): Mat;
    mean(): Scalar;
    meanStdDev(): { mean: Scalar; stddev: Scalar };
    laplacian(ddepth: number, ksize?: number): Mat;
    countNonZero(): number;
    empty(): boolean;
    cvtColor(code: number): Mat;
    release(): void;
    canny(threshold1: number, threshold2: number, apertureSize?: number, L2gradient?: boolean): Mat;
    flip(flipCode: number): Mat;
    absDiff(other: Mat): Mat;
    findContours(mode: number, method: number): any[];
    split(): Mat[];
  }

  export class CascadeClassifier {
    constructor(xmlFilePath: string);
    detectMultiScale(
      image: Mat, 
      options?: {
        scaleFactor?: number;
        minNeighbors?: number;
        flags?: number;
        minSize?: Size;
        maxSize?: Size;
      }
    ): DetectionResult;
    detectMultiScale(
      image: Mat,
      scaleFactor?: number,
      minNeighbors?: number,
      flags?: number,
      minSize?: Size,
      maxSize?: Size
    ): Rect[];
  }

  // Static functions
  export function imread(path: string, flags?: number): Mat;
  export function imwrite(path: string, mat: Mat): boolean;
  export function imdecode(buffer: Buffer, flags?: number): Mat;
  export function cvtColor(src: Mat, code: number): Mat;
  export function resize(src: Mat, dsize: Size, fx?: number, fy?: number, interpolation?: number): Mat;
  export function findContours(image: Mat, mode: number, method: number): any[];
  export function countNonZero(src: Mat): number;

  // Constructor interfaces
  export interface SizeConstructor {
    new (width: number, height: number): Size;
    (width: number, height: number): Size;
  }
  export interface RectConstructor {
    new (x: number, y: number, width: number, height: number): Rect;
    (x: number, y: number, width: number, height: number): Rect;
  }
  export interface PointConstructor {
    new (x: number, y: number): Point;
    (x: number, y: number): Point;
  }
  
  // Constructor exports
  export const Size: SizeConstructor;
  export const Rect: RectConstructor;
  export const Point: PointConstructor;

  // Constants
  export const COLOR_BGR2GRAY: number;
  export const COLOR_BGR2RGB: number;
  export const COLOR_RGB2BGR: number;
  export const COLOR_BGR2HSV: number;
  export const COLOR_HSV2BGR: number;
  
  export const INTER_LINEAR: number;
  export const INTER_CUBIC: number;
  export const INTER_NEAREST: number;

  export const IMREAD_COLOR: number;
  export const IMREAD_GRAYSCALE: number;
  export const IMREAD_UNCHANGED: number;

  export const CV_64F: number;
  export const CV_32F: number;
  export const CV_8U: number;

  export const RETR_EXTERNAL: number;
  export const RETR_LIST: number;
  export const RETR_CCOMP: number;
  export const RETR_TREE: number;

  export const CHAIN_APPROX_NONE: number;
  export const CHAIN_APPROX_SIMPLE: number;
  export const CHAIN_APPROX_TC89_L1: number;
  export const CHAIN_APPROX_TC89_KCOS: number;
}
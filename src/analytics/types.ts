export interface FunctionChange {
  name: string;
  filePath: string;
  changeCount: number;
  lastModified: Date;
  commits: Array<{
    hash: string;
    timestamp: Date;
    message: string;
  }>;
  coChangedFunctions: Map<string, number>;
}

export interface DependencyLink {
  source: string;
  target: string;
  changeCount: number;
  confidence: number;
}

export interface TimelineEntry {
  timestamp: Date;
  functions: string[];
  commitHash: string;
  commitMessage: string;
}

export interface AnalyticsData {
  functionChanges: Map<string, FunctionChange>;
  dependencies: DependencyLink[];
  timeline: TimelineEntry[];
  hotspots: Array<{
    function: string;
    score: number;
  }>;
}
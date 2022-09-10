export interface ConnectionInfo {
  to: string;
  type: string;
}
export interface ItemInfo {
  ip: string;
}

export interface InfoNode {
  depth: number;
  items: Array<ItemInfo>;
  connections: Array<ConnectionInfo>;
}

export interface InfoTree {
  groups: Record<string, InfoNode>;
}

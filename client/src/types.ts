export interface Event {
  id: number;
  name: string;
  date: string;
  location: string;
}

export interface FakeData {
  events: Event[];
}

export interface Participant {
  id: number;
  name: string;
  rank: string;
  dojo: string;
}

export interface File {
  id: string;
  name: string;
  type: 'file';
}

export interface Folder {
  id: string;
  name: string;
  type: 'folder';
  children: Array<File | Folder>;
}

export class Group {
    id: number;
    name: string;
    createdBy: string;  // username or userId of creator
    channels: string[]; // later if you want channels inside groups

  constructor(id: number, name: string, createdBy: string, channels: string[] = []) {
    this.id = id;
    this.name = name;
    this.createdBy = createdBy;
    this.channels = channels;
  }
}

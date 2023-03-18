import { GUI } from "dat.gui"

export class Debug {
  private gui: GUI

  public settings: {
    progress: number
  }

  constructor() {
    this.settings = {
      progress: 0.6,
    }
    this.gui = new GUI()
    this.gui.add(this.settings, "progress", 0, 1, 0.01)
  }
}
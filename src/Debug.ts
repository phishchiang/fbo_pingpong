import { GUI } from "dat.gui"

export class Debug {
  private gui: GUI

  public settings: {
    randomness: number
    air_resistance: number
  }

  constructor() {
    this.settings = {
      randomness: 0.6,
      air_resistance: 0.1,
    }
    this.gui = new GUI()
    this.gui.add(this.settings, "randomness", 0, 1, 0.01)
    this.gui.add(this.settings, "air_resistance", 0, 1, 0.01)
  }
}
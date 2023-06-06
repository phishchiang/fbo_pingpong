import { GUI } from "dat.gui"

export class Debug {
  private gui: GUI

  public settings: {
    randomness: number
    air_resistance: number
    lightX: number
    lightY: number
    lightZ: number
  }

  constructor() {
    this.settings = {
      randomness: 0.6,
      air_resistance: 0.1,
      lightX: 4,
      lightY: 8,
      lightZ: 5,
    }
    this.gui = new GUI()
    this.gui.add(this.settings, "randomness", 0, 1, 0.01)
    this.gui.add(this.settings, "air_resistance", 0, 1, 0.01)
    this.gui.add(this.settings, "lightX", -10, 10, 0.01)
    this.gui.add(this.settings, "lightY", -20, 20, 0.01)
    this.gui.add(this.settings, "lightZ", -10, 10, 0.01)
  }
}
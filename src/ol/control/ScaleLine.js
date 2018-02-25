/**
 * @module ol/control/ScaleLine
 */
import {inherits} from '../index.js';
import BaseObject from '../Object.js';
import {assert} from '../asserts.js';
import Control from '../control/Control.js';
import ScaleLineUnits from '../control/ScaleLineUnits.js';
import {CLASS_UNSELECTABLE} from '../css.js';
import {listen} from '../events.js';
import {getPointResolution, METERS_PER_UNIT} from '../proj.js';
import Units from '../proj/Units.js';


/**
 * @type {string}
 */
const UNITS = 'units';


/**
 * @const
 * @type {Array.<number>}
 */
const LEADING_DIGITS = [1, 2, 5];


/**
 * @classdesc
 * A control displaying rough y-axis distances, calculated for the center of the
 * viewport. For conformal projections (e.g. EPSG:3857, the default view
 * projection in OpenLayers), the scale is valid for all directions.
 * No scale line will be shown when the y-axis distance of a pixel at the
 * viewport center cannot be calculated in the view projection.
 * By default the scale line will show in the bottom left portion of the map,
 * but this can be changed by using the css selector `.ol-scale-line`.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {olx.control.ScaleLineOptions=} opt_options Scale line options.
 * @api
 */
class ScaleLine extends Control {
  constructor(opt_options) {

    const options = opt_options ? opt_options : {};

    const className = options.className !== undefined ? options.className : 'ol-scale-line';

    const innerElement_ = document.createElement('DIV');
    innerElement_.className = className + '-inner';

    const element_ = document.createElement('DIV');
    element_.className = className + ' ' + CLASS_UNSELECTABLE;
    element_.appendChild(innerElement_);

    super({
      element: element_,
      render: options.render || render,
      target: options.target
    });

    /**
     * @private
     * @type {Element}
     */
    this.innerElement_ = innerElement_;

    /**
     * @private
     * @type {Element}
     */
    this.element_ = element_;

    /**
     * @private
     * @type {?olx.ViewState}
     */
    this.viewState_ = null;

    /**
     * @private
     * @type {number}
     */
    this.minWidth_ = options.minWidth !== undefined ? options.minWidth : 64;

    /**
     * @private
     * @type {boolean}
     */
    this.renderedVisible_ = false;

    /**
     * @private
     * @type {number|undefined}
     */
    this.renderedWidth_ = undefined;

    /**
     * @private
     * @type {string}
     */
    this.renderedHTML_ = '';

    listen(
      this, BaseObject.getChangeEventType(UNITS),
      this.handleUnitsChanged_, this);

    this.setUnits(/** @type {ol.control.ScaleLineUnits} */ (options.units) ||
        ScaleLineUnits.METRIC);

  };


  /**
   * Return the units to use in the scale line.
   * @return {ol.control.ScaleLineUnits|undefined} The units to use in the scale
   *     line.
   * @observable
   * @api
   */
  getUnits() {
    return /** @type {ol.control.ScaleLineUnits|undefined} */ (this.get(UNITS));
  };


  /**
   * @private
   */
  handleUnitsChanged_() {
    this.updateElement_();
  };


  /**
   * Set the units to use in the scale line.
   * @param {ol.control.ScaleLineUnits} units The units to use in the scale line.
   * @observable
   * @api
   */
  setUnits(units) {
    this.set(UNITS, units);
  };


  /**
   * @private
   */
  updateElement_() {
    const viewState = this.viewState_;

    if (!viewState) {
      if (this.renderedVisible_) {
        this.element_.style.display = 'none';
        this.renderedVisible_ = false;
      }
      return;
    }

    const center = viewState.center;
    const projection = viewState.projection;
    const units = this.getUnits();
    const pointResolutionUnits = units == ScaleLineUnits.DEGREES ?
      Units.DEGREES :
      Units.METERS;
    let pointResolution =
        getPointResolution(projection, viewState.resolution, center, pointResolutionUnits);
    if (projection.getUnits() != Units.DEGREES && units == ScaleLineUnits.METRIC) {
      pointResolution *= projection.getMetersPerUnit();
    }

    let nominalCount = this.minWidth_ * pointResolution;
    let suffix = '';
    if (units == ScaleLineUnits.DEGREES) {
      const metersPerDegree = METERS_PER_UNIT[Units.DEGREES];
      if (projection.getUnits() == Units.DEGREES) {
        nominalCount *= metersPerDegree;
      } else {
        pointResolution /= metersPerDegree;
      }
      if (nominalCount < metersPerDegree / 60) {
        suffix = '\u2033'; // seconds
        pointResolution *= 3600;
      } else if (nominalCount < metersPerDegree) {
        suffix = '\u2032'; // minutes
        pointResolution *= 60;
      } else {
        suffix = '\u00b0'; // degrees
      }
    } else if (units == ScaleLineUnits.IMPERIAL) {
      if (nominalCount < 0.9144) {
        suffix = 'in';
        pointResolution /= 0.0254;
      } else if (nominalCount < 1609.344) {
        suffix = 'ft';
        pointResolution /= 0.3048;
      } else {
        suffix = 'mi';
        pointResolution /= 1609.344;
      }
    } else if (units == ScaleLineUnits.NAUTICAL) {
      pointResolution /= 1852;
      suffix = 'nm';
    } else if (units == ScaleLineUnits.METRIC) {
      if (nominalCount < 0.001) {
        suffix = 'μm';
        pointResolution *= 1000000;
      } else if (nominalCount < 1) {
        suffix = 'mm';
        pointResolution *= 1000;
      } else if (nominalCount < 1000) {
        suffix = 'm';
      } else {
        suffix = 'km';
        pointResolution /= 1000;
      }
    } else if (units == ScaleLineUnits.US) {
      if (nominalCount < 0.9144) {
        suffix = 'in';
        pointResolution *= 39.37;
      } else if (nominalCount < 1609.344) {
        suffix = 'ft';
        pointResolution /= 0.30480061;
      } else {
        suffix = 'mi';
        pointResolution /= 1609.3472;
      }
    } else {
      assert(false, 33); // Invalid units
    }

    let i = 3 * Math.floor(
      Math.log(this.minWidth_ * pointResolution) / Math.log(10));
    let count, width;
    while (true) {
      count = LEADING_DIGITS[((i % 3) + 3) % 3] *
          Math.pow(10, Math.floor(i / 3));
      width = Math.round(count / pointResolution);
      if (isNaN(width)) {
        this.element_.style.display = 'none';
        this.renderedVisible_ = false;
        return;
      } else if (width >= this.minWidth_) {
        break;
      }
      ++i;
    }

    const html = count + ' ' + suffix;
    if (this.renderedHTML_ != html) {
      this.innerElement_.innerHTML = html;
      this.renderedHTML_ = html;
    }

    if (this.renderedWidth_ != width) {
      this.innerElement_.style.width = width + 'px';
      this.renderedWidth_ = width;
    }

    if (!this.renderedVisible_) {
      this.element_.style.display = '';
      this.renderedVisible_ = true;
    }

  };
}

/**
 * Update the scale line element.
 * @param {ol.MapEvent} mapEvent Map event.
 * @this {ol.control.ScaleLine}
 * @api
 */
export function render(mapEvent) {
  const frameState = mapEvent.frameState;
  if (!frameState) {
    this.viewState_ = null;
  } else {
    this.viewState_ = frameState.viewState;
  }
  this.updateElement_();
}


export default ScaleLine;

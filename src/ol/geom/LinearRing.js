/**
 * @module ol/geom/LinearRing
 */
import {closestSquaredDistanceXY} from '../extent.js';
import GeometryLayout from '../geom/GeometryLayout.js';
import GeometryType from '../geom/GeometryType.js';
import SimpleGeometry from '../geom/SimpleGeometry.js';
import {linearRing as linearRingArea} from '../geom/flat/area.js';
import {assignClosestPoint, maxSquaredDelta} from '../geom/flat/closest.js';
import {deflateCoordinates} from '../geom/flat/deflate.js';
import {inflateCoordinates} from '../geom/flat/inflate.js';
import {douglasPeucker} from '../geom/flat/simplify.js';

/**
 * @classdesc
 * Linear ring geometry. Only used as part of polygon; cannot be rendered
 * on its own.
 *
 * @constructor
 * @extends {ol.geom.SimpleGeometry}
 * @param {Array.<ol.Coordinate>} coordinates Coordinates.
 * @param {ol.geom.GeometryLayout=} opt_layout Layout.
 * @api
 */
class LinearRing extends SimpleGeometry {
  constructor(coordinates, opt_layout) {

    super();

    /**
     * @private
     * @type {number}
     */
    this.maxDelta_ = -1;

    /**
     * @private
     * @type {number}
     */
    this.maxDeltaRevision_ = -1;

    this.setCoordinates(coordinates, opt_layout);

  }


  /**
   * Make a complete copy of the geometry.
   * @return {!ol.geom.LinearRing} Clone.
   * @override
   * @api
   */
  clone() {
    const linearRing = new LinearRing(null);
    linearRing.setFlatCoordinates(this.layout, this.flatCoordinates.slice());
    return linearRing;
  }


  /**
   * @inheritDoc
   */
  closestPointXY(x, y, closestPoint, minSquaredDistance) {
    if (minSquaredDistance < closestSquaredDistanceXY(this.getExtent(), x, y)) {
      return minSquaredDistance;
    }
    if (this.maxDeltaRevision_ != this.getRevision()) {
      this.maxDelta_ = Math.sqrt(maxSquaredDelta(
        this.flatCoordinates, 0, this.flatCoordinates.length, this.stride, 0));
      this.maxDeltaRevision_ = this.getRevision();
    }
    return assignClosestPoint(
      this.flatCoordinates, 0, this.flatCoordinates.length, this.stride,
      this.maxDelta_, true, x, y, closestPoint, minSquaredDistance);
  }


  /**
   * Return the area of the linear ring on projected plane.
   * @return {number} Area (on projected plane).
   * @api
   */
  getArea() {
    return linearRingArea(this.flatCoordinates, 0, this.flatCoordinates.length, this.stride);
  }


  /**
   * Return the coordinates of the linear ring.
   * @return {Array.<ol.Coordinate>} Coordinates.
   * @override
   * @api
   */
  getCoordinates() {
    return inflateCoordinates(
      this.flatCoordinates, 0, this.flatCoordinates.length, this.stride);
  }


  /**
   * @inheritDoc
   */
  getSimplifiedGeometryInternal(squaredTolerance) {
    const simplifiedFlatCoordinates = [];
    simplifiedFlatCoordinates.length = douglasPeucker(
      this.flatCoordinates, 0, this.flatCoordinates.length, this.stride,
      squaredTolerance, simplifiedFlatCoordinates, 0);
    const simplifiedLinearRing = new LinearRing(null);
    simplifiedLinearRing.setFlatCoordinates(
      GeometryLayout.XY, simplifiedFlatCoordinates);
    return simplifiedLinearRing;
  }


  /**
   * @inheritDoc
   * @api
   */
  getType() {
    return GeometryType.LINEAR_RING;
  }


  /**
   * @inheritDoc
   */
  intersectsExtent(extent) {}


  /**
   * Set the coordinates of the linear ring.
   * @param {Array.<ol.Coordinate>} coordinates Coordinates.
   * @param {ol.geom.GeometryLayout=} opt_layout Layout.
   * @override
   * @api
   */
  setCoordinates(coordinates, opt_layout) {
    if (!coordinates) {
      this.setFlatCoordinates(GeometryLayout.XY, null);
    } else {
      this.setLayout(opt_layout, coordinates, 1);
      if (!this.flatCoordinates) {
        this.flatCoordinates = [];
      }
      this.flatCoordinates.length = deflateCoordinates(
        this.flatCoordinates, 0, coordinates, this.stride);
      this.changed();
    }
  }


  /**
   * @param {ol.geom.GeometryLayout} layout Layout.
   * @param {Array.<number>} flatCoordinates Flat coordinates.
   */
  setFlatCoordinates(layout, flatCoordinates) {
    this.setFlatCoordinatesInternal(layout, flatCoordinates);
    this.changed();
  }
}
export default LinearRing;

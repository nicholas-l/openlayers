/**
 * @module ol/geom/Geometry
 */
import BaseObject from '../Object.js';
import {createEmpty, getHeight, returnOrUpdate} from '../extent.js';
import {FALSE} from '../functions.js';
import {transform2D} from '../geom/flat/transform.js';
import {get as getProjection, getTransform} from '../proj.js';
import Units from '../proj/Units.js';
import {create as createTransform, compose as composeTransform} from '../transform.js';

/**
 * @classdesc
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * Base class for vector geometries.
 *
 * To get notified of changes to the geometry, register a listener for the
 * generic `change` event on your geometry instance.
 *
 * @constructor
 * @abstract
 * @extends {ol.Object}
 * @api
 */
class Geometry extends BaseObject {
  constructor() {

    super();

    /**
     * @private
     * @type {ol.Extent}
     */
    this.extent_ = createEmpty();

    /**
     * @private
     * @type {number}
     */
    this.extentRevision_ = -1;

    /**
     * @protected
     * @type {Object.<string, ol.geom.Geometry>}
     */
    this.simplifiedGeometryCache = {};

    /**
     * @protected
     * @type {number}
     */
    this.simplifiedGeometryMaxMinSquaredTolerance = 0;

    /**
     * @protected
     * @type {number}
     */
    this.simplifiedGeometryRevision = 0;

    /**
     * @private
     * @type {ol.Transform}
     */
    this.tmpTransform_ = createTransform();

    /**
     * @param {number} x X.
     * @param {number} y Y.
     * @return {boolean} Contains (x, y).
     */
    this.containsXY = FALSE;

  }


  /**
   * Make a complete copy of the geometry.
   * @abstract
   * @return {!ol.geom.Geometry} Clone.
   */
  clone() {}


  /**
   * @abstract
   * @param {number} x X.
   * @param {number} y Y.
   * @param {ol.Coordinate} closestPoint Closest point.
   * @param {number} minSquaredDistance Minimum squared distance.
   * @return {number} Minimum squared distance.
   */
  closestPointXY(x, y, closestPoint, minSquaredDistance) {}


  /**
   * Return the closest point of the geometry to the passed point as
   * {@link ol.Coordinate coordinate}.
   * @param {ol.Coordinate} point Point.
   * @param {ol.Coordinate=} opt_closestPoint Closest point.
   * @return {ol.Coordinate} Closest point.
   * @api
   */
  getClosestPoint(point, opt_closestPoint) {
    const closestPoint = opt_closestPoint ? opt_closestPoint : [NaN, NaN];
    this.closestPointXY(point[0], point[1], closestPoint, Infinity);
    return closestPoint;
  }


  /**
   * Returns true if this geometry includes the specified coordinate. If the
   * coordinate is on the boundary of the geometry, returns false.
   * @param {ol.Coordinate} coordinate Coordinate.
   * @return {boolean} Contains coordinate.
   * @api
   */
  intersectsCoordinate(coordinate) {
    return this.containsXY(coordinate[0], coordinate[1]);
  }


  /**
   * @abstract
   * @param {ol.Extent} extent Extent.
   * @protected
   * @return {ol.Extent} extent Extent.
   */
  computeExtent(extent) {}


  /**
   * Get the extent of the geometry.
   * @param {ol.Extent=} opt_extent Extent.
   * @return {ol.Extent} extent Extent.
   * @api
   */
  getExtent(opt_extent) {
    if (this.extentRevision_ != this.getRevision()) {
      this.extent_ = this.computeExtent(this.extent_);
      this.extentRevision_ = this.getRevision();
    }
    return returnOrUpdate(this.extent_, opt_extent);
  }


  /**
   * Rotate the geometry around a given coordinate. This modifies the geometry
   * coordinates in place.
   * @abstract
   * @param {number} angle Rotation angle in radians.
   * @param {ol.Coordinate} anchor The rotation center.
   * @api
   */
  rotate(angle, anchor) {}


  /**
   * Scale the geometry (with an optional origin).  This modifies the geometry
   * coordinates in place.
   * @abstract
   * @param {number} sx The scaling factor in the x-direction.
   * @param {number=} opt_sy The scaling factor in the y-direction (defaults to
   *     sx).
   * @param {ol.Coordinate=} opt_anchor The scale origin (defaults to the center
   *     of the geometry extent).
   * @api
   */
  scale(sx, opt_sy, opt_anchor) {}


  /**
   * Create a simplified version of this geometry.  For linestrings, this uses
   * the the {@link
   * https://en.wikipedia.org/wiki/Ramer-Douglas-Peucker_algorithm
   * Douglas Peucker} algorithm.  For polygons, a quantization-based
   * simplification is used to preserve topology.
   * @function
   * @param {number} tolerance The tolerance distance for simplification.
   * @return {ol.geom.Geometry} A new, simplified version of the original
   *     geometry.
   * @api
   */
  simplify(tolerance) {
    return this.getSimplifiedGeometry(tolerance * tolerance);
  }


  /**
   * Create a simplified version of this geometry using the Douglas Peucker
   * algorithm.
   * @see https://en.wikipedia.org/wiki/Ramer-Douglas-Peucker_algorithm
   * @abstract
   * @param {number} squaredTolerance Squared tolerance.
   * @return {ol.geom.Geometry} Simplified geometry.
   */
  getSimplifiedGeometry(squaredTolerance) {}


  /**
   * Get the type of this geometry.
   * @abstract
   * @return {ol.geom.GeometryType} Geometry type.
   */
  getType() {}


  /**
   * Apply a transform function to each coordinate of the geometry.
   * The geometry is modified in place.
   * If you do not want the geometry modified in place, first `clone()` it and
   * then use this function on the clone.
   * @abstract
   * @param {ol.TransformFunction} transformFn Transform.
   */
  applyTransform(transformFn) {}


  /**
   * Test if the geometry and the passed extent intersect.
   * @abstract
   * @param {ol.Extent} extent Extent.
   * @return {boolean} `true` if the geometry and the extent intersect.
   */
  intersectsExtent(extent) {}


  /**
   * Translate the geometry.  This modifies the geometry coordinates in place.  If
   * instead you want a new geometry, first `clone()` this geometry.
   * @abstract
   * @param {number} deltaX Delta X.
   * @param {number} deltaY Delta Y.
   */
  translate(deltaX, deltaY) {}


  /**
   * Transform each coordinate of the geometry from one coordinate reference
   * system to another. The geometry is modified in place.
   * For example, a line will be transformed to a line and a circle to a circle.
   * If you do not want the geometry modified in place, first `clone()` it and
   * then use this function on the clone.
   *
   * @param {ol.ProjectionLike} source The current projection.  Can be a
   *     string identifier or a {@link ol.proj.Projection} object.
   * @param {ol.ProjectionLike} destination The desired projection.  Can be a
   *     string identifier or a {@link ol.proj.Projection} object.
   * @return {ol.geom.Geometry} This geometry.  Note that original geometry is
   *     modified in place.
   * @api
   */
  transform(source, destination) {
    const tmpTransform = this.tmpTransform_;
    source = getProjection(source);
    const transformFn = source.getUnits() == Units.TILE_PIXELS ?
      function(inCoordinates, outCoordinates, stride) {
        const pixelExtent = source.getExtent();
        const projectedExtent = source.getWorldExtent();
        const scale = getHeight(projectedExtent) / getHeight(pixelExtent);
        composeTransform(tmpTransform,
          projectedExtent[0], projectedExtent[3],
          scale, -scale, 0,
          0, 0);
        transform2D(inCoordinates, 0, inCoordinates.length, stride,
          tmpTransform, outCoordinates);
        return getTransform(source, destination)(inCoordinates, outCoordinates, stride);
      } :
      getTransform(source, destination);
    this.applyTransform(transformFn);
    return this;
  }
}
export default Geometry;

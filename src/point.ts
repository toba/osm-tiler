/**
 * A standalone point geometry with useful accessor, comparison, and
 * modification methods.
 *
 * @example
 * var point = new Point(-77, 38);
 */
export class Point {
   x: number;
   y: number;

   /**
    * @param x The x-coordinate — this could be longitude or screen
    * pixels, or any other sort of unit
    * @param y The y-coordinate — this could be latitude or screen
    * pixels, or any other sort of unit
    */
   constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
   }

   /**
    * Clone this point, returning a new point that can be modified
    * without affecting the old one.
    */
   clone = () => new Point(this.x, this.y);

   /**
    * Add this point's x & y coordinates to another point,
    * yielding a new point.
    */
   add = (p: Point) => this.clone().addPoint(p);

   /**
    * Subtract this point's x & y coordinates to from point,
    * yielding a new point.
    */
   sub = (p: Point) => this.clone().subtractPoint(p);

   /**
    * Multiply this point's x & y coordinates by point,
    * yielding a new point.
    */
   multByPoint = (p: Point) => this.clone().multiplyByPoint(p);

   /**
    * Divide this point's x & y coordinates by point,
    * yielding a new point.
    */
   divByPoint = (p: Point) => this.clone().divideByPoint(p);

   /**
    * Multiply this point's x & y coordinates by a factor,
    * yielding a new point.
    */
   mult = (k: number) => this.clone().multiply(k);

   /**
    * Divide this point's x & y coordinates by a factor,
    * yielding a new point.
    */
   div = (k: number) => this.clone().divide(k);

   /**
    * Rotate this point around the 0, 0 origin by an angle a,
    * given in radians
    * @param a angle to rotate around, in radians
    */
   rotate = (a: number) => this.clone()._rotate(a);

   /**
    * Rotate this point around p point by an angle a,
    * given in radians
    * @param a angle to rotate around, in radians
    * @param p Point to rotate around
    */
   rotateAround = (a: number, p: Point) => this.clone()._rotateAround(a, p);

   /**
    * Multiply this point by a 4x1 transformation matrix
    */
   matMult = (m: [number, number, number, number]) =>
      this.clone().matrixMultiply(m);

   /**
    * Calculate this point but as a unit vector from 0, 0, meaning
    * that the distance from the resulting point to the 0, 0
    * coordinate will be equal to 1 and the angle from the resulting
    * point to the 0, 0 coordinate will be the same as before.
    */
   unit = () => this.clone()._unit();

   /**
    * Compute a perpendicular point, where the new y coordinate
    * is the old x coordinate and the new x coordinate is the old y
    * coordinate multiplied by -1
    */
   perp = () => this.clone()._perp();

   /**
    * Return a version of this point with the x & y coordinates
    * rounded to integers.
    */
   round = () => this.clone()._round();

   /**
    * Return the magnitude of this point: this is the Euclidean
    * distance from the 0, 0 coordinate to this point's x and y
    * coordinates.
    */
   mag = () => Math.sqrt(this.x * this.x + this.y * this.y);

   /**
    * Judge whether this point is equal to another point, returning
    * true or false.
    */
   equals = (p: Point) => this.x === p.x && this.y === p.y;

   /**
    * Calculate the distance from this point to another point
    */
   dist = (p: Point) => Math.sqrt(this.distSqr(p));

   /**
    * Calculate the distance from this point to another point,
    * without the square root step. Useful if you're comparing
    * relative distances.
    */
   distSqr(p: Point) {
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      return dx * dx + dy * dy;
   }

   /**
    * Get the angle from the 0, 0 coordinate to this point, in radians
    * coordinates.
    */
   angle = () => Math.atan2(this.y, this.x);

   /**
    * Get the angle from this point to another point, in radians
    */
   angleTo = (p: Point) => Math.atan2(this.y - p.y, this.x - p.x);

   /**
    * Get the angle between this point and another point, in radians
    */
   angleWith = (p: Point) => this.angleWithSep(p.x, p.y);

   /*
    * Find the angle of the two vectors, solving the formula for
    * the cross product a x b = |a||b|sin(θ) for θ.
    */
   angleWithSep = (x: number, y: number) =>
      Math.atan2(this.x * y - this.y * x, this.x * x + this.y * y);

   private matrixMultiply(m: [number, number, number, number]) {
      const x = m[0] * this.x + m[1] * this.y;
      const y = m[2] * this.x + m[3] * this.y;
      this.x = x;
      this.y = y;

      return this;
   }

   private addPoint(p: Point) {
      this.x += p.x;
      this.y += p.y;

      return this;
   }

   private subtractPoint(p: Point) {
      this.x -= p.x;
      this.y -= p.y;

      return this;
   }

   private multiply(k: number) {
      this.x *= k;
      this.y *= k;
      return this;
   }

   private divide(k: number) {
      this.x /= k;
      this.y /= k;
      return this;
   }

   private multiplyByPoint(p: Point) {
      this.x *= p.x;
      this.y *= p.y;
      return this;
   }

   private divideByPoint(p: Point) {
      this.x /= p.x;
      this.y /= p.y;
      return this;
   }

   private _unit() {
      this.divide(this.mag());
      return this;
   }

   private _perp() {
      const y = this.y;
      this.y = this.x;
      this.x = -y;
      return this;
   }

   private _rotate(angle: number) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = cos * this.x - sin * this.y;
      const y = sin * this.x + cos * this.y;
      this.x = x;
      this.y = y;

      return this;
   }

   private _rotateAround(angle: number, p: Point) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = p.x + cos * (this.x - p.x) - sin * (this.y - p.y);
      const y = p.y + sin * (this.x - p.x) + cos * (this.y - p.y);
      this.x = x;
      this.y = y;
      return this;
   }

   private _round() {
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);
      return this;
   }

   /**
    * Construct a point from an array if necessary, otherwise if the input
    * is already a Point, or an unknown type, return it unchanged
    *
    * @example
    * // this
    * var point = Point.convert([0, 1]);
    * // is equivalent to
    * var point = new Point(0, 1);
    */
   static convert(a: Point | [number, number]) {
      if (a instanceof Point) {
         return a;
      }
      if (Array.isArray(a)) {
         return new Point(a[0], a[1]);
      }
      return a;
   }
}

export type Line = Point[];

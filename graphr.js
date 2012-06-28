Graphr = {
  // The canvas
  paper: null,
  
  // The area the plot(s) reside in
  plotBox: null,
  
  // User config
  settings: {
    // Canvas padding
    padding: {
      top:    40,
      right:  40,
      bottom: 40,
      left:   40
    },
    // Canvas dimensions
    width:   640,
    height:  480,
    // Number of gridlines
    gridlines: {
      x: 5,
      y: 10
    },
    // The length that the ticks extend past the plot
    gridlinesTickLength: 8,
    // Colour of the plot bounding box
    backgroundColour: "#fafafa",
    // The order colours are used for .plot()
    colours: [
      // Red
      "#ee7951",
      // Blue
      "#88bbc8",
      // Green
      "#82d07a"
    ],
    // Draw data points on the curve
    drawPoints: true,
    // Join data with a smooth (Catmull-Rom) curve or with individual lines
    smoothCurve: true
  },
  
  // Properties of the canvas
  properties: {
    // Plot dimensions
    innerWidth: null,
    innerHeight: null,
    // Maximum data and function values
    extrema: {
      xMin: null,
      xMax: null,
      yMin: null,
      yMax: null
    },
    // Scaling required to make data fit in the `plotBox`
    xScale: null,
    yScale: null,
    // Current colour index, the index of `colours` array
    colourIndex: 0
  },
  
  shapes: {
    path: function(pathString, stroke, strokeWidth) {
      // Set defaults
      if (stroke === undefined)      stroke      = Graphr.settings.colours[0];
      if (strokeWidth === undefined) strokeWidth = 2;
      
      return Graphr.paper.path(pathString).attr({stroke: stroke, "stroke-width": strokeWidth});
    },
    point: function(x, y, radius, fill, stroke, strokeWidth) {
      // Set defaults
      if (fill === undefined)        fill       = Graphr.settings.colours[0];
      if (stroke === undefined)      stroke      = Graphr.settings.backgroundColour;
      if (strokeWidth === undefined) strokeWidth = 2;
      
      return Graphr.paper.circle(x, y, radius).attr({fill: fill, stroke: stroke, "stroke-width": strokeWidth});
    }
  },
  
  init: function(container, width, height) {
    this.settings.width         = width;
    this.properties.innerWidth  = width - (this.settings.padding.left + this.settings.padding.right);
    this.settings.height        = height;
    this.properties.innerHeight = height - (this.settings.padding.top + this.settings.padding.bottom);
    
    // Create the canvas
    this.paper = Raphael(container, width, height);
    
    // White background
    this.paper.rect(0, 0, this.settings.width, this.settings.height, 0).attr({fill: "#fff", "stroke-width": 1});
    // The area the plot will reside in
    this.plotBox = this.paper.rect(
      // We add a pixel on to make sure points on the boundary return true for isPointInside
      this.settings.padding.top - 1,
      this.settings.padding.left - 1,
      this.properties.innerWidth + 2,
      this.properties.innerHeight + 2,
      0
    ).attr({fill: this.settings.backgroundColour, stroke: "#fff"});
    
    // Chainable
    return this;
  },
  
  plot: function(data) {    
    // Set the extrema properties and scale values if they haven't been set
    if (this.properties.xScale === null || this.properties.yScale === null) {
      this.properties.extrema = this.findExtrema(data);
      this.setScale();
      this.drawGrid();
    }
    
    // Are we drawing a curve yet?
    var drawingCurve = false,
        pathString = "",
        colour = this.settings.colours[this.nextColourIndex()];
    
    for (var i = 0; i < data.length; i++) {
      var scaledCoords = this.scaledCoordinates(data[i][0], data[i][1]);
      
      if (this.plotBox.isPointInside(scaledCoords[0], scaledCoords[1]) === true) {
        if (drawingCurve === false) {
          // Start drawing!
          pathString = "M " + scaledCoords[0] + " " + scaledCoords[1];
          if (this.settings.smoothCurve === true) pathString += " R";
          drawingCurve = true;
        } else {
          // We're already drawing
          if (this.settings.smoothCurve === true) {
            pathString += " " + scaledCoords[0] + " " + scaledCoords[1];
          } else {
            // lineto
            pathString += "L" + scaledCoords[0] + " " + scaledCoords[1];
          }
        }
      }
    }
    
    // If the path isn't empty, draw it
    if (pathString !== "") this.shapes.path(pathString, colour);
    
    // I don't like having this loop and function call twice, but I need to construct
    // the path string and create the path before the points in order to have the points
    // on top of the path
    if (this.settings.drawPoints === true) {
      for (var i = 0; i < data.length; i++) {
        scaledCoords = this.scaledCoordinates(data[i][0], data[i][1]);
        
        this.shapes.point(scaledCoords[0], scaledCoords[1], 5, colour);
        this.shapes.point(scaledCoords[0], scaledCoords[1], 2, this.settings.backgroundColour, "none", 0);
      }
    }
    
    return this;
  },
  
  findExtrema: function(data) {
    var xMax = data[0][0],
        xMin = data[0][0],
        yMax = data[0][1],
        yMin = data[0][1];
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] > xMax) xMax = data[i][0];
      if (data[i][0] < xMin) xMin = data[i][0];
      if (data[i][1] > yMax) yMax = data[i][1];
      if (data[i][1] < yMin) yMin = data[i][1];
    }
    
    return {
      xMax: xMax,
      xMin: xMin,
      yMax: yMax,
      yMin: yMin
    };
  },
  
  setScale: function() {
    this.properties.xScale = this.properties.innerWidth / this.properties.extrema.xMax;
    this.properties.yScale = this.properties.innerHeight /
                              Math.abs(this.properties.extrema.yMax - this.properties.extrema.yMin);
  },
  
  // Draws the plot gridlines, ticks, and tick numbers
  drawGrid: function() {
    var origin = {
      x: this.settings.padding.left,
      y: this.settings.padding.top + this.properties.innerHeight
    },
    // The width, in pixels, between gridlines
    gridSpacing = {
      x: this.properties.innerWidth / this.settings.gridlines.x,
      y: this.properties.innerHeight / this.settings.gridlines.y
    };
    
    // Store some computations
    var a = origin.y + this.settings.gridlinesTickLength,
        b = origin.x - this.settings.gridlinesTickLength,
        c = origin.x + this.properties.innerWidth,
        // The numerical (data) spacing between gridlines
        xDiff = Math.abs(this.properties.extrema.xMax - this.properties.extrema.xMin) / this.settings.gridlines.x,
        yDiff = Math.abs(this.properties.extrema.yMax - this.properties.extrema.yMin) / this.settings.gridlines.y;
    
    // Vertical gridlines
    for (var i = 0; i <= this.settings.gridlines.x; i++) {
      var x = (origin.x + (i * gridSpacing.x));
      var pathString = "M" + x + " " + a +
                       "L" + x + " " + this.settings.padding.top;
      this.shapes.path(pathString, "#e5e5e5", 1);
      this.paper.text(x, a + 10, (this.properties.extrema.xMin + (i * xDiff)).toFixed(2));
    }
    
    // Horizontal
    for (var i = 0; i <= this.settings.gridlines.y; i++) {
      var y = this.settings.padding.top + (i * gridSpacing.y),
          pathString = "M" + b + " " + y +
                       "L" + c + " " + y;
      this.shapes.path(pathString, "#e5e5e5", 1).attr({"stroke-dasharray": "--"});
      this.paper.text(b - 15, y, (this.properties.extrema.yMax - (i * yDiff)).toFixed(2))
    }
  },
  
  scaledCoordinates: function(x, y, extrema) {
    var scaled_x = this.settings.padding.left + (x * this.properties.xScale),
        scaled_y = (this.settings.height - this.settings.padding.bottom)
                   // Expand this bracket out to make it more obvious, if you like
                   - ((y - this.properties.extrema.yMin) * this.properties.yScale);
    return [scaled_x, scaled_y];
  },
  
  // Returns the next colour index, looping back around if we've reached the end of the colour array
  nextColourIndex: function() {
    if (this.properties.colourIndex == this.settings.colours.length) {
      this.properties.colourIndex = 0;
    }
    return this.properties.colourIndex++;
  },
  
  // http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
  log: function() {
    if (window.console) {
      console.log(Array.prototype.slice.call(arguments));
    }
  }
};
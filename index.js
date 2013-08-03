#!/usr/bin/env node-openvg

var assert = require('assert');

var vg = require('openvg');
var tiger = require(__dirname + '/lib/tiger');

function PS(ps) {
  var commands     = ps.commands;
  var points       = ps.points;
  var commandCount = commands.length;
  var pointCount   = points.length;

  var paths = this.paths = [];

  var p = 0;
  var c = 0;
  var i = 0;
  var pathCount = 0;
  var maxElements = 0;
  var cmd;
  var elements, e;

  while (c < commandCount) {
    c += 4;
    p += 8;
    elements = points[p++];
    assert(elements > 0);
    if (elements > maxElements) maxElements = elements;
    for (e = 0; e < elements; e++) {
      switch(commands[c]) {
      case 'M': p += 2; break;
      case 'L': p += 2; break;
      case 'C': p += 6; break;
      case 'E': break;
      default: assert(false); //unknown command
      }
      c++;
    }
    pathCount++;
  }

  ps = new Array(pathCount);
  for (i = 0; i < pathCount; i++) {
    paths[i] = {
      fillRule    : 0,
      paintMode   : 0,
      capStyle    : 0,
      joinStyle   : 0,
      miterLimit  : 0,
      strokeWidth : 0,
      fillPaint   : 0,
      strokePaint : 0,
      path        : null
    };
  }

  cmd = new Uint8Array(maxElements);

  i = 0;
  p = 0;
  c = 0;
  while(c < commandCount) {
    var startp;
    var color = new Float32Array(4);

    //fill type
    var paintMode = 0;
    paths[i].fillRule = vg.VGFillRule.VG_NON_ZERO;
    switch (commands[c]) {
    case 'N':
      break;
    case 'F':
      paths[i].fillRule = vg.VGFillRule.VG_NON_ZERO;
      paintMode |= vg.VGPaintMode.VG_FILL_PATH;
      break;
    case 'E':
      paths[i].fillRule = vg.VGFillRule.VG_EVEN_ODD;
      paintMode |= vg.VGPaintMode.VG_FILL_PATH;
      break;
    default:
      assert(false);    //unknown command
    }
    c++;

    //stroke
    switch (commands[c]) {
    case 'N':
      break;
    case 'S':
      paintMode |= vg.VGPaintMode.VG_STROKE_PATH;
      break;
    default:
      assert(false);    //unknown command
    }
    paths[i].paintMode = paintMode;
    c++;

    //line cap
    switch (commands[c]) {
    case 'B':
      paths[i].capStyle = vg.VGCapStyle.VG_CAP_BUTT;
      break;
    case 'R':
      paths[i].capStyle = vg.VGCapStyle.VG_CAP_ROUND;
      break;
    case 'S':
      paths[i].capStyle = vg.VGCapStyle.VG_CAP_SQUARE;
      break;
    default:
      assert(false);    //unknown command
    }
    c++;

    //line join
    switch (commands[c]) {
    case 'M':
      paths[i].joinStyle = vg.VGJoinStyle.VG_JOIN_MITER;
      break;
    case 'R':
      paths[i].joinStyle = vg.VGJoinStyle.VG_JOIN_ROUND;
      break;
    case 'B':
      paths[i].joinStyle = vg.VGJoinStyle.VG_JOIN_BEVEL;
      break;
    default:
      assert(false);    //unknown command
    }
    c++;

    //the rest of stroke attributes
    paths[i].miterLimit  = points[p++];
    paths[i].strokeWidth = points[p++];

    //paints
    color[0] = points[p++];
    color[1] = points[p++];
    color[2] = points[p++];
    color[3] = 1.0;
    paths[i].strokePaint = vg.createPaint();
    vg.setParameterI (paths[i].strokePaint, vg.VGPaintParamType.VG_PAINT_TYPE, vg.VGPaintType.VG_PAINT_TYPE_COLOR);
    vg.setParameterIV(paths[i].strokePaint, vg.VGPaintParamType.VG_PAINT_COLOR, color);

    color[0] = points[p++];
    color[1] = points[p++];
    color[2] = points[p++];
    color[3] = 1.0;
    paths[i].fillPaint = vg.createPaint();
    vg.setParameterI (paths[i].fillPaint, vg.VGPaintParamType.VG_PAINT_TYPE, vg.VGPaintType.VG_PAINT_TYPE_COLOR);
    vg.setParameterFV(paths[i].fillPaint, vg.VGPaintParamType.VG_PAINT_COLOR, color);

    //read number of elements

    elements = points[p++];
    assert(elements > 0);
    startp = p;
    for (e = 0; e < elements; e++) {
      switch (commands[c]) {
      case 'M':
        cmd[e] = vg.VGPathSegment.VG_MOVE_TO | vg.VGPathAbsRel.VG_ABSOLUTE;
        p += 2;
        break;
      case 'L':
        cmd[e] = vg.VGPathSegment.VG_LINE_TO | vg.VGPathAbsRel.VG_ABSOLUTE;
        p += 2;
        break;
      case 'C':
        cmd[e] = vg.VGPathSegment.VG_CUBIC_TO | vg.VGPathAbsRel.VG_ABSOLUTE;
        p += 6;
        break;
      case 'E':
        cmd[e] = vg.VGPathSegment.VG_CLOSE_PATH;
        break;
      default:
        assert(0);    //unknown command
      }
      c++;
    }

    paths[i].path = vg.createPath(vg.VG_PATH_FORMAT_STANDARD,
                                  vg.VGPathDatatype.VG_PATH_DATATYPE_F,
                                  1.0, 0.0,
                                  0,
                                  0,
                                  vg.VGPathCapabilities.VG_PATH_CAPABILITY_ALL);
    vg.appendPathDataO(paths[i].path, elements, cmd, 0, points, startp * 4);
    i++;
  }
}

PS.prototype.destruct = function () {
  var paths = this.paths;
  for(var i = paths.length - 1; i >= 0; i--) {
    vg.destroyPaint(paths[i].fillPaint);
    vg.destroyPaint(paths[i].strokePaint);
    vg.destroyPath (paths[i].path);
  }
  paths.length = 0;
  this.paths = undefined;
}

function assertVGError() {
  var err = vg.getError();
  if (err != vg.VGErrorCode.VG_NO_ERROR) {
    console.log('vgError: ' + err.toString(16) + ' - ' + vg.VGErrorCodeReverse[err]);
    assert(err == vg.VGErrorCode.VG_NO_ERROR);
  }
}

PS.prototype.render = function () {
  vg.setI(vg.VGParamType.VG_BLEND_MODE, vg.VGBlendMode.VG_BLEND_SRC_OVER);

  var paths = this.paths;
  for (var i = 0; i < paths.length; i++) {
    vg.setI(vg.VGParamType.VG_FILL_RULE, paths[i].fillRule);
    vg.setPaint(paths[i].fillPaint, vg.VGPaintMode.VG_FILL_PATH);

    if(paths[i].paintMode & vg.VGPaintMode.VG_STROKE_PATH) {
      vg.setF(vg.VGParamType.VG_STROKE_LINE_WIDTH , paths[i].strokeWidth);
      vg.setI(vg.VGParamType.VG_STROKE_CAP_STYLE  , paths[i].capStyle   );
      vg.setI(vg.VGParamType.VG_STROKE_JOIN_STYLE , paths[i].joinStyle  );
      vg.setF(vg.VGParamType.VG_STROKE_MITER_LIMIT, paths[i].miterLimit );
      vg.setPaint(paths[i].strokePaint, vg.VGPaintMode.VG_STROKE_PATH);
    }

    vg.drawPath(paths[i].path, paths[i].paintMode);
  }

  assertVGError();
}

function render(w, h, tiger, ps, s, r) {
  var clearColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
  var scaleX = w / (tiger.maxX - tiger.minX) * s;
  var scaleY = h / (tiger.maxY - tiger.minY) * s;
  var scale = Math.min(scaleX, scaleY);

  vg.egl.swapBuffers(vg.screen.display, vg.screen.surface);

  vg.setFV(vg.VGParamType.VG_CLEAR_COLOR, clearColor);
  vg.clear(0, 0, w, h);

  vg.loadIdentity();
  vg.rotate(r);
  vg.scale(scale, scale);
  vg.translate(-tiger.minX, -tiger.minY + 0.5 * (h / scale - (tiger.maxY - tiger.minY)));

  ps.render();

  vg.egl.swapBuffers(vg.screen.display, vg.screen.surface);
  assertVGError();
}

function main() {
  vg.init();
  assertVGError();

  vg.clear(0, 0, vg.screen.width, vg.screen.height);
  vg.loadIdentity();

  var ps = new PS(tiger);
  render(vg.screen.width, vg.screen.height, tiger, ps, 1.0, 0);

  console.log('Hit Ctrl-C to exit.');
  var s = 1.0, r = 0;
  setInterval(function () {
    // if (s > 0.4) { s = s - 0.005 };
    // r += 1;
    render(vg.screen.width, vg.screen.height, tiger, ps, s, r);
  }, 1000 / 60);
}

main();

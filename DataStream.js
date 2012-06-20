/**
  DataStream reads scalars, arrays and structs of data from an ArrayBuffer.
  It's like a file-like DataView on steroids.

  @param {ArrayBuffer} arrayBuffer ArrayBuffer to read from.
  @param {?Number} byteOffset Offset from arrayBuffer beginning for the DataStream.
  @param {?Boolean} endianness DataStream.BIG_ENDIAN or DataStream.LITTLE_ENDIAN (the default).
  */
DataStream = function(arrayBuffer, byteOffset, endianness) {
  this._byteOffset = byteOffset || 0;
  if (arrayBuffer instanceof ArrayBuffer) {
    this.buffer = arrayBuffer;
  } else if (typeof arrayBuffer == "object") {
    this.dataView = arrayBuffer;
    if (byteOffset) {
      this._byteOffset += byteOffset;
    }
  } else {
    this.buffer = new ArrayBuffer(arrayBuffer || 0);
  }
  this.position = 0;
  this.endianness = endianness == null ? DataStream.LITTLE_ENDIAN : endianness;
};
DataStream.prototype = {};

/**
  Big-endian const to use as default endianness.
  */
DataStream.BIG_ENDIAN = false;

/**
  Little-endian const to use as default endianness.
  */
DataStream.LITTLE_ENDIAN = true;

/**
  Whether to extend DataStream buffer when trying to write beyond its size.
  If set, the buffer is reallocated to twice its current size until the
  requested write fits the buffer.
  */
DataStream.prototype._dynamicSize = true;
Object.defineProperty(DataStream.prototype, 'dynamicSize',
  { get: function() {
      return this._dynamicSize;
    },
    set: function(v) {
      if (!v) {
        this._trimAlloc();
      }
      this._dynamicSize = v;
    } });

/**
  Virtual byte length of the DataStream backing buffer.
  Updated to be max of original buffer size and last written size.
  If dynamicSize is false is set to buffer size.
  */
DataStream.prototype._byteLength = 0;

/**
  Returns the byte length of the DataStream object.
  */
Object.defineProperty(DataStream.prototype, 'byteLength',
  { get: function() {
    return this._byteLength - this._byteOffset;
  }});

/**
  Set/get the backing ArrayBuffer of the DataStream object.
  The setter updates the DataView to point to the new buffer.
  */
Object.defineProperty(DataStream.prototype, 'buffer',
  { get: function() {
      this._trimAlloc();
      return this._buffer;
    },
    set: function(v) {
      this._buffer = v;
      this._dataView = new DataView(this._buffer, this._byteOffset);
      this._byteLength = this._buffer.byteLength;
    } });

/**
  Set/get the byteOffset of the DataStream object.
  The setter updates the DataView to point to the new byteOffset.
  */
Object.defineProperty(DataStream.prototype, 'byteOffset',
  { get: function() {
      return this._byteOffset;
    },
    set: function(v) {
      this._byteOffset = v;
      this._dataView = new DataView(this._buffer, this._byteOffset);
      this._byteLength = this._buffer.byteLength;
    } });

/**
  Set/get the backing DataView of the DataStream object.
  The setter updates the buffer and byteOffset to point to the DataView values.
  */
Object.defineProperty(DataStream.prototype, 'dataView',
  { get: function() {
      return this._dataView;
    },
    set: function(v) {
      this._buffer = v.buffer;
      this._byteOffset = v.byteOffset;
      this._dataView = new DataView(this._buffer, this._byteOffset);
      this._byteLength = this._byteOffset + v.byteLength;
    } });

DataStream.prototype._realloc = function(extra) {
  if (!this._dynamicSize) {
    return;
  }
  var req = this._byteOffset + this.position + extra;
  var blen = this._buffer.byteLength;
  if (req <= blen) {
    if (req > this._byteLength) {
      this._byteLength = req;
    }
    return;
  }
  if (blen < 1) {
    blen = 1;
  }
  while (req > blen) {
    blen *= 2;
  }
  var buf = new ArrayBuffer(blen);
  var src = new Uint8Array(this._buffer);
  var dst = new Uint8Array(buf, 0, src.length);
  dst.set(src);
  this.buffer = buf;
  this._byteLength = req;
};

DataStream.prototype._trimAlloc = function() {
  if (this._byteLength == this._buffer.byteLength) {
    return;
  }
  var buf = new ArrayBuffer(this._byteLength);
  var dst = new Uint8Array(buf);
  var src = new Uint8Array(this._buffer, 0, dst.length);
  dst.set(src);
  this.buffer = buf;
};

/**
  Sets the DataStream read/write position to given position.
  Clamps between 0 and DataStream length.
  */
DataStream.prototype.seek = function(pos) {
  var npos = Math.max(0, Math.min(this.byteLength, pos));
  this.position = (isNaN(npos) || !isFinite(npos)) ? 0 : npos;
};

/**
  Returns true if the DataStream pointer is at the end of buffer and there's
  no more data to read.
  */
DataStream.prototype.isEof = function() {
  return (this.position >= this._byteLength);
};


DataStream.prototype.mapInt32Array = function(length, e) {
  this._realloc(length * 4);
  var arr = new Int32Array(this.buffer, this.byteOffset+this.position, length);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += length * 4;
  return arr;
};

DataStream.prototype.mapInt16Array = function(length, e) {
  this._realloc(length * 2);
  var arr = new Int16Array(this.buffer, this.byteOffset+this.position, length);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += length * 2;
  return arr;
};

DataStream.prototype.mapInt8Array = function(length) {
  this._realloc(length * 1);
  var arr = new Int8Array(this.buffer, this.byteOffset+this.position, length);
  this.position += length * 1;
  return arr;
};

DataStream.prototype.mapUint32Array = function(length, e) {
  this._realloc(length * 4);
  var arr = new Uint32Array(this.buffer, this.byteOffset+this.position, length);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += length * 4;
  return arr;
};

DataStream.prototype.mapUint16Array = function(length, e) {
  this._realloc(length * 2);
  var arr = new Uint16Array(this.buffer, this.byteOffset+this.position, length);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += length * 2;
  return arr;
};

DataStream.prototype.mapUint8Array = function(length) {
  this._realloc(length * 1);
  var arr = new Uint8Array(this.buffer, this.byteOffset+this.position, length);
  this.position += length * 1;
  return arr;
};

DataStream.prototype.mapFloat64Array = function(length, e) {
  this._realloc(length * 8);
  var arr = new Float64Array(this.buffer, this.byteOffset+this.position, length);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += length * 8;
  return arr;
};

DataStream.prototype.mapFloat32Array = function(length, e) {
  this._realloc(length * 4);
  var arr = new Float32Array(this.buffer, this.byteOffset+this.position, length);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += length * 4;
  return arr;
};


DataStream.prototype.readInt32Array = function(length, e) {
  length = length == null ? (this.byteLength-this.position / 4) : length;
  var arr = new Int32Array(length);
  for (var i=0; i<length; i++) {
    arr[i] = this.readInt32(e);
  }
  return arr;
};

DataStream.prototype.readInt16Array = function(length, e) {
  length = length == null ? (this.byteLength-this.position / 2) : length;
  var arr = new Int16Array(length);
  for (var i=0; i<length; i++) {
    arr[i] = this.readInt16(e);
  }
  return arr;
};

DataStream.prototype.readInt8Array = function(length) {
  length = length == null ? (this.byteLength-this.position) : length;
  var arr = new Int8Array(length);
  for (var i=0; i<length; i++) {
    arr[i] = this.readInt8();
  }
  return arr;
};

DataStream.prototype.readUint32Array = function(length, e) {
  length = length == null ? (this.byteLength-this.position / 4) : length;
  var arr = new Uint32Array(length);
  for (var i=0; i<length; i++) {
    arr[i] = this.readUint32(e);
  }
  return arr;
};

DataStream.prototype.readUint16Array = function(length, e) {
  length = length == null ? (this.byteLength-this.position / 2) : length;
  var arr = new Uint16Array(length);
  for (var i=0; i<length; i++) {
    arr[i] = this.readUint16(e);
  }
  return arr;
};

DataStream.prototype.readUint8Array = function(length) {
  length = length == null ? (this.byteLength-this.position) : length;
  var arr = new Uint8Array(length);
  for (var i=0; i<length; i++) {
    arr[i] = this.readUint8();
  }
  return arr;
};

DataStream.prototype.readFloat64Array = function(length, e) {
  length = length == null ? (this.byteLength-this.position / 8) : length;
  var arr = new Float64Array(length);
  for (var i=0; i<length; i++) {
    arr[i] = this.readFloat64(e);
  }
  return arr;
};

DataStream.prototype.readFloat32Array = function(length, e) {
  length = length == null ? (this.byteLength-this.position / 4) : length;
  var arr = new Float32Array(length);
  for (var i=0; i<length; i++) {
    arr[i] = this.readFloat32(e);
  }
  return arr;
};


DataStream.prototype.writeInt32Array = function(arr, e) {
  this._realloc(arr.length * 4);
  for (var i=0; i<arr.length; i++) {
    this.writeInt32(arr[i], e);
  }
};

DataStream.prototype.writeInt16Array = function(arr, e) {
  this._realloc(arr.length * 2);
  for (var i=0; i<arr.length; i++) {
    this.writeInt16(arr[i], e);
  }
};

DataStream.prototype.writeInt8Array = function(arr) {
  this._realloc(arr.length * 1);
  for (var i=0; i<arr.length; i++) {
    this.writeInt8(arr[i]);
  }
};

DataStream.prototype.writeUint32Array = function(arr, e) {
  this._realloc(arr.length * 4);
  for (var i=0; i<arr.length; i++) {
    this.writeUint32(arr[i], e);
  }
};

DataStream.prototype.writeUint16Array = function(arr, e) {
  this._realloc(arr.length * 2);
  for (var i=0; i<arr.length; i++) {
    this.writeUint16(arr[i], e);
  }
};

DataStream.prototype.writeUint8Array = function(arr) {
  this._realloc(arr.length * 1);
  for (var i=0; i<arr.length; i++) {
    this.writeUint8(arr[i]);
  }
};

DataStream.prototype.writeFloat64Array = function(arr, e) {
  this._realloc(arr.length * 8);
  for (var i=0; i<arr.length; i++) {
    this.writeFloat64(arr[i], e);
  }
};

DataStream.prototype.writeFloat32Array = function(arr, e) {
  this._realloc(arr.length * 4);
  for (var i=0; i<arr.length; i++) {
    this.writeFloat32(arr[i], e);
  }
};



DataStream.prototype.readInt32 = function(e) {
  var v = this._dataView.getInt32(this.position, e == null ? this.endianness : e);
  this.position += 4;
  return v;
};

DataStream.prototype.readInt16 = function(e) {
  var v = this._dataView.getInt16(this.position, e == null ? this.endianness : e);
  this.position += 2;
  return v;
};

DataStream.prototype.readInt8 = function() {
  var v = this._dataView.getInt8(this.position);
  this.position += 1;
  return v;
};

DataStream.prototype.readUint32 = function(e) {
  var v = this._dataView.getUint32(this.position, e == null ? this.endianness : e);
  this.position += 4;
  return v;
};

DataStream.prototype.readUint16 = function(e) {
  var v = this._dataView.getUint16(this.position, e == null ? this.endianness : e);
  this.position += 2;
  return v;
};

DataStream.prototype.readUint8 = function() {
  var v = this._dataView.getUint8(this.position);
  this.position += 1;
  return v;
};

DataStream.prototype.readFloat32 = function(e) {
  var v = this._dataView.getFloat32(this.position, e == null ? this.endianness : e);
  this.position += 4;
  return v;
};

DataStream.prototype.readFloat64 = function(e) {
  var v = this._dataView.getFloat64(this.position, e == null ? this.endianness : e);
  this.position += 8;
  return v;
};


DataStream.prototype.writeInt32 = function(v, e) {
  this._realloc(4);
  this._dataView.setInt32(this.position, v, e == null ? this.endianness : e);
  this.position += 4;
};

DataStream.prototype.writeInt16 = function(v, e) {
  this._realloc(2);
  this._dataView.setInt16(this.position, v, e == null ? this.endianness : e);
  this.position += 2;
};

DataStream.prototype.writeInt8 = function(v) {
  this._realloc(1);
  this._dataView.setInt8(this.position, v);
  this.position += 1;
};

DataStream.prototype.writeUint32 = function(v, e) {
  this._realloc(4);
  this._dataView.setUint32(this.position, v, e == null ? this.endianness : e);
  this.position += 4;
};

DataStream.prototype.writeUint16 = function(v, e) {
  this._realloc(2);
  this._dataView.setUint16(this.position, v, e == null ? this.endianness : e);
  this.position += 2;
};

DataStream.prototype.writeUint8 = function(v) {
  this._realloc(1);
  this._dataView.setUint8(this.position, v);
  this.position += 1;
};

DataStream.prototype.writeFloat32 = function(v, e) {
  this._realloc(4);
  this._dataView.setFloat32(this.position, v, e == null ? this.endianness : e);
  this.position += 4;
};

DataStream.prototype.writeFloat64 = function(v, e) {
  this._realloc(8);
  this._dataView.setFloat64(this.position, v, e == null ? this.endianness : e);
  this.position += 8;
};


DataStream.endianness = new Int8Array(new Int16Array([1]).buffer)[0] > 0;

DataStream.arrayToNative = function(array, arrayIsLittleEndian) {
  if (arrayIsLittleEndian == this.endianness) {
    return array;
  } else {
    return this.flipArrayEndianness(array);
  }
};

DataStream.nativeToEndian = function(array, littleEndian) {
  if (this.endianness == littleEndian) {
    return array;
  } else {
    return this.flipArrayEndianness(array);
  }
};

DataStream.flipArrayEndianness = function(array) {
  var u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  for (var i=0; i<array.byteLength; i+=array.BYTES_PER_ELEMENT) {
    for (var j=i+array.BYTES_PER_ELEMENT-1, k=i; j>k; j--, k++) {
      var tmp = u8[k];
      u8[k] = u8[j];
      u8[j] = tmp;
    }
  }
  return array;
};

DataStream.prototype.failurePosition = 0;

DataStream.prototype.readStruct = function(structDefinition) {
  var struct = {}, t, v, n;
  var p = this.position;
  for (var i=0; i<structDefinition.length; i+=2) {
    t = structDefinition[i+1];
    v = this.readType(t, struct);
    if (v == null) {
      if (this.failurePosition == 0) {
        this.failurePosition = this.position;
      }
      this.position = p;
      return null;
    }
    struct[structDefinition[i]] = v;
  }
  return struct;
};

DataStream.prototype.readUTF16String = function(length, endianness) {
  return String.fromCharCode.apply(null, this.readUint16Array(length, endianness));
};

DataStream.prototype.writeUTF16String = function(str, endianness, lengthOverride) {
  if (lengthOverride == null) {
    lengthOverride = str.length;
  }
  for (var i = 0; i < str.length && i < lengthOverride; i++) {
    this.writeUint16(str.charCodeAt(i), endianness);
  }
  for (; i<lengthOverride; i++) {
    this.writeUint16(0);
  }
};

DataStream.prototype.readString = function(length, encoding) {
  if (encoding == null || encoding == "ASCII") {
    return String.fromCharCode.apply(null, this.mapUint8Array(length == null ? this.byteLength-this.position : length));
  } else {
    throw("Unsupported encoding " + encoding);
  }
};

DataStream.prototype.writeString = function(s, encoding, length) {
  if (encoding == null || encoding == "ASCII") {
    if (length != null) {
      var i = 0;
      var len = Math.min(s.length, length);
      for (i=0; i<len; i++) {
        this.writeUint8(s.charCodeAt(i));
      }
      for (; i<length; i++) {
        this.writeUint8(0);
      }
    } else {
      for (var i=0; i<s.length; i++) {
        this.writeUint8(s.charCodeAt(i));
      }
      this.writeUint8(0);
    }
  }
};


DataStream.prototype.readCString = function(length) {
  var blen = this.byteLength-this.position;
  var u8 = new Uint8Array(this._buffer, this._byteOffset + this.position);
  var len = blen;
  if (length != null) {
    len = Math.min(length, blen);
  }
  for (var i = 0; i < len && u8[i] != 0; i++); // find first zero byte
  var s = String.fromCharCode.apply(null, this.mapUint8Array(i));
  if (length != null) {
    this.position += len-i;
  } else if (i != blen) {
    this.position += 1; // trailing zero if not at end of buffer
  }
  return s;
};

DataStream.prototype.writeCString = function(s, length) {
  if (length != null) {
    var i = 0;
    var len = Math.min(s.length, length);
    for (i=0; i<len; i++) {
      this.writeUint8(s.charCodeAt(i));
    }
    for (; i<length; i++) {
      this.writeUint8(0);
    }
  } else {
    for (var i=0; i<s.length; i++) {
      this.writeUint8(s.charCodeAt(i));
    }
    this.writeUint8(0);
  }
};

DataStream.prototype.readType = function(t, struct) {
  if (typeof t == "function") {
    return t(this, struct);
  } else if (typeof t == "object" && !(t instanceof Array)) {
    return t.get(this, struct);
  } else if (t instanceof Array && t.length != 3) {
    return this.readStruct(t, struct);
  }
  var v = null;
  var lengthOverride = null;
  var pos = this.position;
  if (typeof t == 'string' && /:/.test(t)) {
    var tp = t.split(":");
    t = tp[0];
    lengthOverride = parseInt(tp[1]);
  }
  switch(t) {

    case 'uint8':
      v = this.readUint8(); break;
    case 'int8':
      v = this.readInt8(); break;

    case 'uint16':
      v = this.readUint16(this.endianness); break;
    case 'int16':
      v = this.readInt16(this.endianness); break;
    case 'uint32':
      v = this.readUint32(this.endianness); break;
    case 'int32':
      v = this.readInt32(this.endianness); break;
    case 'float32':
      v = this.readFloat32(this.endianness); break;
    case 'float64':
      v = this.readFloat64(this.endianness); break;

    case 'uint16be':
      v = this.readUint16(DataStream.BIG_ENDIAN); break;
    case 'int16be':
      v = this.readInt16(DataStream.BIG_ENDIAN); break;
    case 'uint32be':
      v = this.readUint32(DataStream.BIG_ENDIAN); break;
    case 'int32be':
      v = this.readInt32(DataStream.BIG_ENDIAN); break;
    case 'float32be':
      v = this.readFloat32(DataStream.BIG_ENDIAN); break;
    case 'float64be':
      v = this.readFloat64(DataStream.BIG_ENDIAN); break;

    case 'uint16le':
      v = this.readUint16(DataStream.LITTLE_ENDIAN); break;
    case 'int16le':
      v = this.readInt16(DataStream.LITTLE_ENDIAN); break;
    case 'uint32le':
      v = this.readUint32(DataStream.LITTLE_ENDIAN); break;
    case 'int32le':
      v = this.readInt32(DataStream.LITTLE_ENDIAN); break;
    case 'float32le':
      v = this.readFloat32(DataStream.LITTLE_ENDIAN); break;
    case 'float64le':
      v = this.readFloat64(DataStream.LITTLE_ENDIAN); break;

    case 'cstring':
      v = this.readCString(lengthOverride); break;

    case 'string':
      v = this.readString(lengthOverride); break;

    case 'u16string':
      v = this.readUTF16String(lengthOverride, this.endianness); break;

    case 'u16stringle':
      v = this.readUTF16String(lengthOverride, DataStream.LITTLE_ENDIAN); break;

    case 'u16stringbe':
      v = this.readUTF16String(lengthOverride, DataStream.BIG_ENDIAN); break;

    default:
      if (t.length == 3) {
        var ta = t[1];
        var len = t[2];
        var length = 0;
        if (typeof len == 'function') {
          length = len(struct, this, t);
        } else if (typeof len == 'string' && struct[len] != null) {
          length = parseInt(struct[len]);
        } else {
          length = parseInt(len);
        }
        if (typeof ta == "string") {
          var tap = ta.replace(/(le|be)$/, '');
          var endianness = null;
          if (/le$/.test(ta)) {
            endianness = DataStream.LITTLE_ENDIAN;
          } else if (/be$/.test(ta)) {
            endianness = DataStream.BIG_ENDIAN;
          }
          if (len == '*') {
            length = null;
          }
          switch(tap) {
            case 'uint8':
              v = this.readUint8Array(length); break;
            case 'uint16':
              v = this.readUint16Array(length, endianness); break;
            case 'uint32':
              v = this.readUint32Array(length, endianness); break;
            case 'int8':
              v = this.readInt8Array(length); break;
            case 'int16':
              v = this.readInt16Array(length, endianness); break;
            case 'int32':
              v = this.readInt32Array(length, endianness); break;
            case 'float32':
              v = this.readFloat32Array(length, endianness); break;
            case 'float64':
              v = this.readFloat64Array(length, endianness); break;
            case 'cstring':
            case 'utf16string':
            case 'string':
              if (length == null) {
                v = [];
                while (!this.isEof()) {
                  var u = this.readType(ta, struct);
		  if (u == null) break;
		  v.push(u);
                }
              } else {
                v = new Array(length);
                for (var i=0; i<length; i++) {
                  v[i] = this.readType(ta, struct);
                }
              }
              break;
          }
        } else {
          if (len == '*') {
            v = [];
            this.buffer;
            while (true) {
              var p = this.position;
              try {
                var o = this.readType(ta, struct);
                if (o == null) {
                  this.position = p;
                  break;
                }
                v.push(o);
              } catch(e) {
                this.position = p;
                break;
              }
            }
          } else {
            v = new Array(length);
            for (var i=0; i<length; i++) {
              var u = this.readType(ta, struct);
              if (u == null) return null;
              v[i] = u;
            }
          }
        }
        break;
      }
  }
  if (lengthOverride != null) {
    this.position = pos + lengthOverride;
  }
  return v;
};

DataStream.prototype.writeStruct = function(structDefinition, struct) {
  for (var i = 0; i < structDefinition.length; i+=2) {
    var t = structDefinition[i+1];
    this.writeType(t, struct[structDefinition[i]], struct);
  }
};

DataStream.prototype.writeType = function(t, v, struct) {
  if (typeof t == "function") {
    return t(this, v);
  } else if (typeof t == "object" && !(t instanceof Array)) {
    return t.set(this, v, struct);
  }
  var lengthOverride = null;
  var pos = this.position;
  if (typeof(t) == 'string' && /:/.test(t)) {
    var tp = t.split(":");
    t = tp[0];
    lengthOverride = parseInt(tp[1]);
  }

  switch(t) {
    case 'uint8':
      this.writeUint8(v);
      break;
    case 'int8':
      this.writeInt8(v);
      break;

    case 'uint16':
      this.writeUint16(v, this.endianness);
      break;
    case 'int16':
      this.writeInt16(v, this.endianness);
      break;
    case 'uint32':
      this.writeUint32(v, this.endianness);
      break;
    case 'int32':
      this.writeInt32(v, this.endianness);
      break;
    case 'float32':
      this.writeFloat32(v, this.endianness);
      break;
    case 'float64':
      this.writeFloat64(v, this.endianness);
      break;

    case 'uint16be':
      this.writeUint16(v, DataStream.BIG_ENDIAN);
      break;
    case 'int16be':
      this.writeInt16(v, DataStream.BIG_ENDIAN);
      break;
    case 'uint32be':
      this.writeUint32(v, DataStream.BIG_ENDIAN);
      break;
    case 'int32be':
      this.writeInt32(v, DataStream.BIG_ENDIAN);
      break;
    case 'float32be':
      this.writeFloat32(v, DataStream.BIG_ENDIAN);
      break;
    case 'float64be':
      this.writeFloat64(v, DataStream.BIG_ENDIAN);
      break;

    case 'uint16le':
      this.writeUint16(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'int16le':
      this.writeInt16(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'uint32le':
      this.writeUint32(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'int32le':
      this.writeInt32(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'float32le':
      this.writeFloat32(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'float64le':
      this.writeFloat64(v, DataStream.LITTLE_ENDIAN);
      break;

    case 'cstring':
      this.writeCString(v, lengthOverride);
      break;

    case 'string':
      this.writeString(v, null, lengthOverride);
      break;

    case 'u16string':
      this.writeUTF16String(v, this.endianness, lengthOverride);
      break;

    case 'u16stringle':
      this.writeUTF16String(v, DataStream.LITTLE_ENDIAN, lengthOverride);
      break;

    case 'u16stringbe':
      this.writeUTF16String(v, DataStream.BIG_ENDIAN, lengthOverride);
      break;

    default:
      if (t.length == 3) {
        var ta = t[1];
        for (var i=0; i<v.length; i++) {
          this.writeType(ta, v[i]);
        }
        break;
      } else {
        this.writeStruct(t, v);
        break;
      }
  }
  if (lengthOverride != null) {
    this.position = pos;
    this._realloc(lengthOverride);
    this.position = pos + lengthOverride;
  }
};


///**
// * Appearing in the Quake III Arena source code[1],
// * this strange algorithm uses integer operations
// * along with a 'magic number' to calculate floating point
// * approximation values of inverse square roots[5].
// */
//const dataView = new DataView(new ArrayBuffer(8));
//const intVars = new Int32Array(4);
//const floatVars = new Float32Array(4);
//
//const intConsts = new Int32Array(1);
//const floatConsts = new Float32Array(2);
//
//intConsts[0] = 0x5f3759df;
//floatConsts[0] = 1.5; //threehalfs
//floatConsts[1] = 0.5; //onehalf
//
//function fisqrt (n, p = 1) {
//    floatVars[0] = n;
//    floatVars[1] = floatVars[0] * floatConsts[1];
//    dataView.setFloat32(0, floatVars[1]);
//    intVars[0] = dataView.getInt32(0); // evil floating point bit level hacking
//    intVars[1] = intConsts[0] - (intVars[0] >> 1); // what the fuck?
//    dataView.setInt32(0, intVars[1]);
//    floatVars[2] = dataView.getFloat32(0);
//    floatVars[2] = floatVars[2] * (floatConsts[0] - (floatVars[1] * floatVars[2] * floatVars[2])); // 1st iteration
//    //floatVars[2] = floatVars[2] * (floatConsts[0] - (floatVars[1] * floatVars[2] * floatVars[2])); // 2nd iteration, this can be removed
//
//    return floatVars[2];
//}
var module, i, length;

export function findVectorsAngleSin (v1, v2) {
    var dot       = 0;
    if (!v1.module)
        for (i = 0, module = 0, length = v1.length, v1.module = 0; i < length; i++)
            if (v1[i]) v1.module += v1[i] * v1[i];
    if (!v2.module)
        for (i = 0, module = 0, length = v2.length, v2.module = 0; i < length; i++)
            if (v2[i]) v2.module += v2[i] * v2[i];

    /* if we will get division by zero */
    if (v1.module === 0 || v2.module === 0)
        return null;

    var minLength = Math.min(v1.length, v2.length);
    for (var i = 0; i < minLength; i++)
        dot += v1[i] * v2[i];

    return 1 - dot / Math.sqrt(v1.module * v2.module);
}
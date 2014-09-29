#define sampleSize .5           // How accurately to sample spectrum, must be a factor of 1.0
                                  // Setting this too low may crash your browser!

// Helper for intensityToColour
float h2rgb(float h) {
	if(h < 0.0) h += 1.0;
	if(h < 0.166666) return 0.1 + 4.8 * h;
	if(h < 0.5) return 0.9;
	if(h < 0.666666) return 0.1 + 4.8 * (0.666666 - h);
	return 0.1;
}

// Map [0, 1] to rgb using hues from [240, 0] - ie blue to red
vec3 intensityToColour(float i) {
	// Algorithm rearranged from http://www.w3.org/TR/css3-color/#hsl-color
	// with s = 0.8, l = 0.5
    const float usedSpectrumPart = 0.66666;
	float h = usedSpectrumPart - (i * usedSpectrumPart);
	
	return vec3(h2rgb(h + usedSpectrumPart / 2.), h2rgb(h), h2rgb(h - usedSpectrumPart / 2.));
}


const float maxColumnWidth = 20.;
const float columnCount = 50.; //todo when transfering - create defn
float columnWidth = iResolution.x / columnCount;
float cellHeight = columnWidth / 1.82;
float cellCount = ceil(iResolution.y / cellHeight);
vec2 cellSize = vec2(columnWidth, cellHeight);

const float timeOffsetK = .25;
float relativeOffset = iGlobalTime * timeOffsetK * 2.;
float offset = relativeOffset * cellHeight;

const float seed = 87667058.69593290;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float getTriangleBrightness(vec2 coord, vec2 resolution) {
    float idx = coord.x * 100. + coord.y;
    idx = mod(seed, idx);
	return mod(sin(idx +  iGlobalTime / 100.), .1) * 5.;
}

void main() {
    vec2 columnOffset = vec2(0., offset + floor(mod(floor(gl_FragCoord.x / cellSize.x), 2.)) * cellHeight);

    vec2 offsettedCoord = vec2(gl_FragCoord) + columnOffset;
    vec2 cellIndex = floor(offsettedCoord / cellSize);
    vec2 localCoord = mod(offsettedCoord, cellSize);
    vec2 localCoordRelative = localCoord / cellSize;
    cellIndex.y -= 
        mod(cellIndex.y, 2.) * floor(localCoordRelative.x - localCoordRelative.y)
        + 
		mod(cellIndex.y + 1., 2.) * floor(1. - localCoordRelative.y - localCoordRelative.x)
        ;
    
    vec2 locIdx = cellIndex - columnOffset / cellSize;
    vec2 locPos = vec2(columnCount, cellCount);
    vec2 uv = locIdx / locPos;
    float base = getTriangleBrightness(cellIndex, locPos);        

    uv.x = min(uv.x, 1. - uv.x) * 2.;
    
    const float barSize = 1.0 / columnCount;
	
	// Get the starting x for this bar by rounding down
	float barStart = floor(uv.x * columnCount) / columnCount;
	
	// Sample spectrum in bar area, keep cumulative total
	float intensity = 0.0;
	for(float s = 0.0; s < barSize; s += barSize * sampleSize) {
		// Shader toy shows loudness at a given frequency at (f, 0) with the same value in all channels
		intensity += texture2D(iChannel0, vec2(barStart + s, 0.0)).r;
	}
	intensity *= sampleSize; // Divide total by number of samples taken (which is 1 / sampleSize)
	intensity = clamp(intensity, 0.005, 1.0); // Show silent spectrum to be just poking out of the bottom

    
	vec3 color = vec3(base);
    color = mix(color, intensityToColour(intensity), (sign (intensity - uv.y) + .5) * .25 * intensity - uv.y);	
    gl_FragColor = vec4(color, 1.);
}
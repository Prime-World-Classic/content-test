// Uber shader. Leave first line non functional

varying vec2 fragTexCoord;

#if defined(VS_UV2) || defined(VS_UV2_UNUSED)
varying vec2 fragTexCoord2;
#endif

#ifdef VS_COLOR
varying vec4 fragColor;
#endif

uniform sampler2D tex0;

#ifdef TEX2
uniform sampler2D tex1;
#endif

#ifdef TEX3
uniform sampler2D tex2;
#endif

#ifdef TEX4
uniform sampler2D tex3;
#endif

#ifdef VS_NORMAL
varying vec3 fragNormal;
#endif

#ifdef RENDER_PASS_COLOR
uniform sampler2D smTexture;
uniform vec4 zNear_zFar;

uniform mat4 lightViewProj;

varying vec4 v_projectedTexcoord;

// Day/night cycle (Castle.updateDayNight): sunLight.rgb - sun colour and strength,
// sunLight.a - exposure; ambientLight.rgb - tint of the light where the sun does not reach.
uniform vec4 sunLight;
uniform vec4 ambientLight;

// Shadow debug (Castle.setShadowDebug): smColor holds the id of the occluder nearest to the sun.
// shadowDebug.x: 0 - off, 1 - tint shadows with the occluder colour, 2 - output the raw id.
uniform sampler2D smColor;
uniform vec4 shadowDebug;
#endif

#ifdef RENDER_PASS_SM
uniform vec4 smDebugColor;
#endif

#ifdef PS_GRID
varying vec2 posXZ;
uniform vec2 cursorGridPosition;
uniform sampler2D gridTex;
#endif
#ifdef SNOW
varying float posDepth;
#endif

uniform mat4 mViewProj;
uniform vec4 tintColor;
uniform vec4 uvScale;
#ifndef SNOW
uniform vec2 uvScroll;
#endif

vec3 neutral(vec3 color) {
  const float startCompression = 0.8 - 0.04;
  const float desaturation = 0.15;

  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;

  float peak = max(color.r, max(color.g, color.b));
  if (peak < startCompression) return color;

  const float d = 1.0 - startCompression;
  float newPeak = 1.0 - d * d / (peak + d - startCompression);
  color *= newPeak / peak;

  float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return mix(color, vec3(newPeak), g);
}

void main()
{
#if 0
  #ifdef SCENE_DOCT
    const vec3 lightColor = vec3(1.0, 1.0, 1.0) * 2.2;
    const float shadowContrast = 0.9;
  #else
    const vec3 lightColor = vec3(1.0, 1.0, 1.2) * 1.6;
    const float shadowContrast = 0.8;
  #endif
#endif
  const vec3 lightColor = vec3(1.0, 1.0, 1.0) * 1.6;
  const float shadowContrast = 0.6;

  const float gridFalloffDistance = 50.0;

#ifdef PS_GRID
  // Grid cells
  gl_FragColor = vec4(0.0, 0.0, 0.0, max(0.0, (1.5 - mod(posXZ.x, 7.0))) + max(0.0, (1.5 - mod(posXZ.y, 7.0))));
  gl_FragColor.rgb += vec3(gl_FragColor.a, gl_FragColor.a, 0.1*gl_FragColor.a);
  float gridMul = clamp(1.0 - gl_FragColor.r * 10000.0, 0.0, 1.0);

  // Grid falloff
  float falloff = sqrt(dot(posXZ - cursorGridPosition, posXZ - cursorGridPosition)) - gridFalloffDistance;
  gl_FragColor.a *= 1.0 - falloff;
  gl_FragColor.a = (max(0.0, gl_FragColor.a - 0.9) / 30.0);
  vec4 gridColor = texture2D(gridTex, (posXZ.xy + vec2(126.0, 77.0)) / vec2(322.0, 266.0) * vec2(46.0 / 64.0, 38.0 / 64.0));
  gl_FragColor += vec4(gridColor * vec4(gridMul));
  //gl_FragColor.a = gl_FragColor.a / (1.0 + abs(gl_FragColor.a));

  vec3 light = vec3(1.0);
#ifdef RENDER_PASS_SM
  discard; // TODO: Remove from SM pass
#endif
#else
  // Diffuse lighting
  vec3 light = lightColor;
#ifdef VS_NORMAL
  // Debug Render Normals
/*
  gl_FragColor = vec4(fragNormal * 0.5 + 0.5, 1.0);
  return;
*/

#ifdef RENDER_PASS_COLOR
  light *= max(0.0, dot(normalize(fragNormal), -normalize(vec3(lightViewProj[0].z, lightViewProj[1].z, lightViewProj[2].z))));
#endif
#endif // VS_NORMAL

  // Albedo
  gl_FragColor = texture2D(tex0, (fragTexCoord + uvScroll) * uvScale.xx);

  gl_FragColor *= tintColor;
#if defined(PS_FALLOFF_BLEND) && defined(VS_COLOR)
  gl_FragColor *= fragColor;
#endif
#endif // PS_GRID

  // Alpha test
#if defined(PS_ALPHAKILL)
  if (gl_FragColor.a - 0.9 < 0.0) {
    discard;
  }
#endif
  #ifndef VS_COLOR
    vec4 fragColor = tintColor;
  #endif
#ifdef TEX2
  gl_FragColor = mix(gl_FragColor, texture2D(tex0, fragTexCoord * uvScale.yy), fragColor.x);
#endif
#ifdef TEX3
  gl_FragColor = mix(gl_FragColor, texture2D(tex2, fragTexCoord * uvScale.zz), fragColor.y);
#endif
#ifdef TEX4
  // WTF?
  //gl_FragColor += texture2D(tex3, fragTexCoord2 * uvScale.ww) * (1.0 - fragColor.w);
#endif

#ifdef RENDER_PASS_COLOR
  // No division needed since there's only one light with orthogonal projection
  vec3 projectedTexcoord = vec3(v_projectedTexcoord.xy * 0.5 + 0.5, v_projectedTexcoord.z);
  float currentDepth = projectedTexcoord.z * 0.5 + 0.5 - ambientLight.w; // depth bias (Castle.ambientLight)
  float projectedDepth = texture2D(smTexture, projectedTexcoord.xy).r;  
  bool inRange = 
      projectedTexcoord.x >= 0.0 &&
      projectedTexcoord.x <= 1.0 &&
      projectedTexcoord.y >= 0.0 &&
      projectedTexcoord.y <= 1.0;
  float shadowLight = (inRange && projectedDepth <= currentDepth) ? 0.0 : 1.0;

  vec3 shadowDebugTint = vec3(-1.0);
  if (shadowDebug.x > 2.5) {
    // mode 3: shadow map coverage - green inside the light frustum, red outside
    gl_FragColor = inRange ? vec4(0.0, 1.0, 0.0, 1.0) : vec4(1.0, 0.0, 0.0, 1.0);
    return;
  }
  if (shadowDebug.x > 0.5) {
    vec4 occluder = texture2D(smColor, projectedTexcoord.xy);
    if (shadowDebug.x > 1.5) {
      gl_FragColor = shadowLight < 0.5 ? vec4(occluder.rg, 1.0, 1.0) : vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    if (shadowLight < 0.5 && occluder.b > 0.99) {
      float hue = fract((occluder.r * 255.0 + occluder.g * 65280.0) * 0.6180339);
      shadowDebugTint = clamp(abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    }
  }

  // Multiply diffuse by shadow weight (0 or 1)
  light *= shadowLight * sunLight.rgb;

  // Apply lighting
  gl_FragColor.xyz *= max(light, shadowContrast * ambientLight.rgb);
  gl_FragColor.xyz *= sunLight.a;

  // Tonemapping
  gl_FragColor.xyz = neutral(gl_FragColor.xyz);
  if (shadowDebugTint.x >= 0.0) {
    // tint follows the sun strength, so at night (no direct light, no visible shadows) it is off
    gl_FragColor.xyz = mix(gl_FragColor.xyz, shadowDebugTint, 0.7 * clamp(sunLight.r, 0.0, 1.0));
  }
#ifdef SNOW
  snow(gl_FragColor, fragTexCoord * uvScale.zw);
  gl_FragColor.w *= posDepth * 0.002;
#endif
  // Exposure
  // gl_FragColor.xyz *= pow(2.0, 0.0); // -0.5
#endif
#ifdef RENDER_PASS_SM
  gl_FragColor = smDebugColor;
#endif
}
import fs from "node:fs";
import path from "node:path";

const config = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8"));
const packageName = config.appId;
const packagePath = packageName.replaceAll(".", "/");
const javaDir = path.join("android", "app", "src", "main", "java", packagePath);
fs.mkdirSync(javaDir, { recursive: true });

const pluginPath = path.join(javaDir, "ShivashaCamera2Plugin.java");
const pluginSource = "package com.shivasha.next;\n\nimport android.Manifest;\nimport android.content.Context;\nimport android.hardware.camera2.CameraCharacteristics;\nimport android.hardware.camera2.CameraManager;\nimport android.os.Build;\n\nimport com.getcapacitor.JSArray;\nimport com.getcapacitor.JSObject;\nimport com.getcapacitor.Plugin;\nimport com.getcapacitor.PluginCall;\nimport com.getcapacitor.PluginMethod;\nimport com.getcapacitor.PermissionState;\nimport com.getcapacitor.annotation.CapacitorPlugin;\nimport com.getcapacitor.annotation.Permission;\nimport com.getcapacitor.annotation.PermissionCallback;\n\n@CapacitorPlugin(\n    name = \"ShivashaCamera2\",\n    permissions = { @Permission(alias = \"camera\", strings = { Manifest.permission.CAMERA }) }\n)\npublic class ShivashaCamera2Plugin extends Plugin {\n    @PluginMethod\n    public void getCameraInfo(PluginCall call) {\n        if (getPermissionState(\"camera\") != PermissionState.GRANTED) {\n            requestPermissionForAlias(\"camera\", call, \"cameraPermissionCallback\");\n            return;\n        }\n        readCameraInfo(call);\n    }\n\n    @PermissionCallback\n    private void cameraPermissionCallback(PluginCall call) {\n        if (getPermissionState(\"camera\") == PermissionState.GRANTED) {\n            readCameraInfo(call);\n        } else {\n            call.reject(\"Camera permission is required to inspect Camera2 capabilities.\");\n        }\n    }\n\n    private void readCameraInfo(PluginCall call) {\n        try {\n            CameraManager manager = (CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE);\n            for (String id : manager.getCameraIdList()) {\n                CameraCharacteristics c = manager.getCameraCharacteristics(id);\n                Integer facing = c.get(CameraCharacteristics.LENS_FACING);\n                if (facing == null || facing != CameraCharacteristics.LENS_FACING_BACK) continue;\n\n                Float maxDigitalZoom = c.get(CameraCharacteristics.SCALER_AVAILABLE_MAX_DIGITAL_ZOOM);\n                Float maxZoomRatio = maxDigitalZoom;\n                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {\n                    android.util.Range<Float> range = c.get(CameraCharacteristics.CONTROL_ZOOM_RATIO_RANGE);\n                    if (range != null) maxZoomRatio = range.getUpper();\n                }\n\n                Integer level = c.get(CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL);\n                JSObject result = new JSObject();\n                result.put(\"cameraId\", id);\n                result.put(\"facing\", \"BACK\");\n                result.put(\"hardwareSupportLevel\", hardwareLevelName(level));\n                result.put(\"maxDigitalZoom\", maxDigitalZoom == null ? 1.0 : maxDigitalZoom.doubleValue());\n                result.put(\"maxZoomRatio\", maxZoomRatio == null ? 1.0 : maxZoomRatio.doubleValue());\n                result.put(\"androidApiLevel\", Build.VERSION.SDK_INT);\n\n                JSArray focalLengths = new JSArray();\n                float[] focal = c.get(CameraCharacteristics.LENS_INFO_AVAILABLE焦CAL_LENGTHS);\n                if (focal != null) for (float value : focal) focalLengths.put(value);\n                result.put(\"focalLengthsMm\", focalLengths);\n\n                JSArray capabilities = new JSArray();\n                int[] caps = c.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES);\n                if (caps != null) {\n                    for (int cap : caps) {\n                        if (cap == CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_MANUAL_SENSOR) capabilities.put(\"MANUAL_SENSOR\");\n                        if (cap == CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_RAW) capabilities.put(\"RAW\");\n                        if (cap == CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_BURST_CAPTURE) capabilities.put(\"BURST_CAPTURE\");\n                        if (cap == CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_MANUAL_POST_PROCESSING) capabilities.put(\"MANUAL_POST_PROCESSING\");\n                    }\n                }\n                result.put(\"capabilities\", capabilities);\n\n                int[] ois = c.get(CameraCharacteristics.LENS_INFO_AVAILABLE_OPTICAL_STABILIZATION);\n                result.put(\"oisAvailable\", containsMode(ois, CameraCharacteristics.LENS_OPTICAL_STABILIZATION_MODE_ON));\n                int[] eis = c.get(CameraCharacteristics.CONTROL_AVAILABLE_VIDEO_STABILIZATION_MODES);\n                result.put(\"videoStabilizationAvailable\", containsMode(eis, CameraCharacteristics.CONTROL_VIDEO_STABILIZATION_MODE_ON));\n                call.resolve(result);\n                return;\n            }\n            call.reject(\"No rear-facing Camera2 camera was found.\");\n        } catch (SecurityException e) {\n            call.reject(\"Camera permission is required.\", e);\n        } catch (Exception e) {\n            call.reject(\"Unable to read Camera2 characteristics: \" + e.getMessage(), e);\n        }\n    }\n\n    private boolean containsMode(int[] modes, int expected) {\n        if (modes == null) return false;\n        for (int mode : modes) if (mode == expected) return true;\n        return false;\n    }\n\n    private String hardwareLevelName(Integer level) {\n        if (level == null) return \"UNKNOWN\";\n        switch (level) {\n            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_LEGACY: return \"LEGACY\";\n            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_LIMITED: return \"LIMITED\";\n            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_FULL: return \"FULL\";\n            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_3: return \"LEVEL_3\";\n            case CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_EXTERNAL: return \"EXTERNAL\";\n            default: return \"UNKNOWN\";\n        }\n    }\n}\n";
fs.writeFileSync(pluginPath, pluginSource);

const javaRoot = path.join("android", "app", "src", "main", "java");
function findMainActivity(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findMainActivity(full);
      if (found) return found;
    } else if (entry.name === "MainActivity.java") return full;
  }
  return null;
}
const activityPath = findMainActivity(javaRoot);
if (!activityPath) throw new Error("Capacitor MainActivity.java was not found.");
let activity = fs.readFileSync(activityPath, "utf8");
if (!activity.includes("ShivashaCamera2Plugin")) {
  activity = activity.replace(/(package [^;]+;)/, "$1\n\nimport " + packageName + ".ShivashaCamera2Plugin;");
  activity = activity.replace(/(public class MainActivity extends BridgeActivity\\s*\\{)/, "$1\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n        registerPlugin(ShivashaCamera2Plugin.class);\n        super.onCreate(savedInstanceState);\n    }");
  fs.writeFileSync(activityPath, activity);
}

const manifestPath = path.join("android", "app", "src", "main", "AndroidManifest.xml");
let manifest = fs.readFileSync(manifestPath, "utf8");
if (!manifest.includes('android.permission.CAMERA')) {
  manifest = manifest.replace("<manifest", '<manifest');
  manifest = manifest.replace(/(<manifest[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.camera.any" android:required="false" />');
  fs.writeFileSync(manifestPath, manifest);
}
console.log("Installed SHIVASHA Camera2 capability bridge for " + packageName);

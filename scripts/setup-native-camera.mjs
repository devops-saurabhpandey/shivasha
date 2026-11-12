import fs from "node:fs";
import path from "node:path";

const config = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8"));
const packageName = config.appId;
const packagePath = packageName.replaceAll(".", "/");
const javaDir = path.join("android", "app", "src", "main", "java", packagePath);
fs.mkdirSync(javaDir, { recursive: true });

const pluginPath = path.join(javaDir, "ShivashaCamera2Plugin.java");
const pluginSource = fs.readFileSync("android-native/ShivashaCamera2Plugin.java.template", "utf8");
if (!pluginSource.startsWith("package " + packageName + ";")) {
  throw new Error("Camera2 plugin package does not match capacitor.config.json appId.");
}
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
  activity = activity.replace(/(public class MainActivity extends BridgeActivity\s*\{)/, "$1\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n        registerPlugin(ShivashaCamera2Plugin.class);\n        super.onCreate(savedInstanceState);\n    }");
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

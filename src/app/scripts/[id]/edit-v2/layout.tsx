import "reactjs-tiptap-editor/style.css";
import "@/styles/editor-v2-static.css";
import "katex/dist/katex.min.css";
import "easydrawer/styles.css";
import "@excalidraw/excalidraw/index.css";
import "prism-code-editor-lightweight/layout.css";
import "prism-code-editor-lightweight/themes/github-dark.css";
import "react-image-crop/dist/ReactCrop.css";

export default function ScriptEditV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import { render } from "preact";
import { Chessboard } from "@gi-tcg/webui";
import "@gi-tcg/webui/index.css";
import "./index.css";

render(<Chessboard />, document.getElementById("app")!);

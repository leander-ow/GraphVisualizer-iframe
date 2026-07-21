import json
from copy import deepcopy
from flask import Flask, request, jsonify, send_from_directory

from src.loader import compute_layout
from src.utils import get_file_datetime_str
from config import GRAPH_FILE, SIDEBAR_LIST_LIMIT, VISIBLE_LIMIT


def build_initial_state(
    tokens,
    pos,
    degree,
    original_graph,
    g,
    filtered,
    layout_duration,
    layout_algorithm,
    filter_limit,
):
    return {
        "tokens": tokens,
        "pos": pos.tolist(),
        "degree": degree.tolist(),
        "original_graph": {f"{k[0]},{k[1]}": v for k, v in original_graph.items()},
        "filtered": filtered.tolist(),
        "layout_duration": float(layout_duration),
        "layout_algorithm": layout_algorithm,
        "filter_limit": int(filter_limit),
        "context_count": len(original_graph),
        "token_count": len(tokens),
        "graph_file_date": get_file_datetime_str(GRAPH_FILE),
        "sidebar_list_limit": SIDEBAR_LIST_LIMIT,
        "visible_limit": VISIBLE_LIMIT,
    }


def node_contexts(original_graph, node_index):
    c_entries, a_entries, b_entries = [], [], []
    for (a, b), values in original_graph.items():
        if a == node_index:
            for c, freq in values:
                a_entries.append((b, c, freq))
        if b == node_index:
            for c, freq in values:
                b_entries.append((a, c, freq))
        for c, freq in values:
            if c == node_index:
                c_entries.append((a, b, freq))
    return c_entries, a_entries, b_entries


def run_server(
    host,
    port,
    tokens,
    pos,
    degree,
    original_graph,
    g,
    filtered,
    layout_duration,
    layout_algorithm,
    filter_limit,
):
    app = Flask(__name__, static_folder="../web", static_url_path="")

    state = {
        "tokens": tokens,
        "pos": pos,
        "degree": degree,
        "original_graph": original_graph,
        "g": g,
        "filtered": filtered,
        "layout_duration": layout_duration,
        "layout_algorithm": layout_algorithm,
        "filter_limit": filter_limit,
    }

    @app.get("/")
    def index():
        return send_from_directory(app.static_folder, "index.html")

    @app.get("/api/state")
    def api_state():
        token = request.args.get("token")
        algorithm = request.args.get("algorithm")
        filter_limit_param = request.args.get("filter_limit")

        if algorithm is not None or filter_limit_param is not None:
            fl = state["filter_limit"]
            if filter_limit_param is not None:
                fl = int(filter_limit_param)

            g2, pos2, degree2, filtered2, duration2, algorithm2, fl2 = compute_layout(
                state["tokens"],
                state["original_graph"],
                algorithm=algorithm or state["layout_algorithm"],
                filter_limit=fl,
            )
            state["g"] = g2
            state["pos"] = pos2
            state["degree"] = degree2
            state["filtered"] = filtered2
            state["layout_duration"] = duration2
            state["layout_algorithm"] = algorithm2
            state["filter_limit"] = fl2

        payload = build_initial_state(
            state["tokens"],
            state["pos"],
            state["degree"],
            state["original_graph"],
            state["g"],
            state["filtered"],
            state["layout_duration"],
            state["layout_algorithm"],
            state["filter_limit"],
        )

        if token and token in state["tokens"]:
            payload["selected_token"] = token
            payload["selected_index"] = state["tokens"].index(token)

        return jsonify(payload)

    @app.get("/api/context/<int:index>")
    def api_context(index):
        if index < 0 or index >= len(state["tokens"]):
            return jsonify({"error": "index out of range"}), 400

        c_entries, a_entries, b_entries = node_contexts(state["original_graph"], index)

        return jsonify(
            {
                "node_index": index,
                "node_token": state["tokens"][index],
                "c_entries": c_entries,
                "a_entries": a_entries,
                "b_entries": b_entries,
            }
        )

    @app.post("/api/recompute")
    def api_recompute():
        body = request.get_json(force=True, silent=True) or {}
        algorithm = body.get("algorithm", state["layout_algorithm"])
        filter_limit = int(body.get("filter_limit", state["filter_limit"]))

        g2, pos2, degree2, filtered2, duration2, algorithm2, fl2 = compute_layout(
            state["tokens"],
            state["original_graph"],
            algorithm=algorithm,
            filter_limit=filter_limit,
        )

        state["g"] = g2
        state["pos"] = pos2
        state["degree"] = degree2
        state["filtered"] = filtered2
        state["layout_duration"] = duration2
        state["layout_algorithm"] = algorithm2
        state["filter_limit"] = fl2

        return jsonify(
            build_initial_state(
                state["tokens"],
                state["pos"],
                state["degree"],
                state["original_graph"],
                state["g"],
                state["filtered"],
                state["layout_duration"],
                state["layout_algorithm"],
                state["filter_limit"],
            )
        )

    app.run(host=host, port=port, debug=False)

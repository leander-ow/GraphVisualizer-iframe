from config import GRAPH_URL, TOKENS_URL, GRAPH_FILE, TOKENS_FILE, HOST, PORT
from src.utils import download
from src.loader import load_tokens, load_graph, compute_layout
from src.server import create_app


def main():
    # Immer neu holen
    download(GRAPH_URL, GRAPH_FILE)
    download(TOKENS_URL, TOKENS_FILE)

    tokens = load_tokens()
    graph = load_graph()

    # Immer neu berechnen mit festen Vorgaben
    g, pos, degree, filtered, duration, algorithm, filter_limit = compute_layout(
        tokens,
        graph,
    )

    return create_app(
        tokens=tokens,
        pos=pos,
        degree=degree,
        original_graph=graph,
        g=g,
        filtered=filtered,
        layout_duration=duration,
        layout_algorithm=algorithm,
        filter_limit=filter_limit,
    )


app = main()

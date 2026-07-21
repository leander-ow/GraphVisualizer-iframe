import zstandard as zstd
import numpy as np
import igraph as ig

from config import (
    GRAPH_FILE,
    TOKENS_FILE,
    DEFAULT_FILTER_LIMIT,
    DEFAULT_ALGORITHM,
)
from src.utils import read_vu8


def load_tokens():
    print("Loading tokens...")
    dctx = zstd.ZstdDecompressor()
    tokens = []

    with open(TOKENS_FILE, "rb") as file:
        reader = dctx.stream_reader(file)

        while True:
            try:
                length = read_vu8(reader)
            except EOFError:
                break

            word = reader.read(length).decode("utf8")
            tokens.append(word)

    print("Tokens loaded:", len(tokens))
    return tokens


def load_graph():
    print("Loading graph...")
    dctx = zstd.ZstdDecompressor()
    graph = {}

    with open(GRAPH_FILE, "rb") as file:
        reader = dctx.stream_reader(file)

        while True:
            try:
                a = read_vu8(reader)
            except EOFError:
                break

            b = read_vu8(reader)
            length = read_vu8(reader)

            values = []
            for _ in range(length):
                token = read_vu8(reader)
                freq = read_vu8(reader)
                values.append((token, freq))

            graph[(a, b)] = values

    print("Contexts loaded:", len(graph))
    return graph


def build_igraph(tokens, graph, filter_limit=DEFAULT_FILTER_LIMIT):
    print(f"Building igraph (filter_limit={filter_limit})...")

    connection_count = np.zeros(len(tokens), dtype=np.int64)

    for (a, b), values in graph.items():
        for c, _ in values:
            connection_count[a] += 1
            connection_count[b] += 1
            connection_count[c] += 1

    if filter_limit < 0:
        filtered = np.zeros(len(tokens), dtype=bool)
    else:
        filtered = connection_count > filter_limit

    edges = {}

    for (a, b), values in graph.items():
        for c, freq in values:
            weight = np.log2(freq + 1)

            if not filtered[b] and not filtered[c]:
                key = tuple(sorted((b, c)))
                edges[key] = edges.get(key, 0) + weight

            if not filtered[a] and not filtered[c]:
                key = tuple(sorted((a, c)))
                edges[key] = edges.get(key, 0) + weight * 0.5

    g = ig.Graph()
    g.add_vertices(len(tokens))
    g.add_edges(list(edges.keys()))
    g.es["weight"] = list(edges.values())

    return g, connection_count.astype(np.float32), graph, filtered, filter_limit


def get_layout(g, algorithm=DEFAULT_ALGORITHM):
    algorithm = algorithm.lower()

    print(f"Computing layout ({algorithm})...")

    import time

    start_time = time.time()

    if algorithm == "drl":
        layout = g.layout_drl(weights="weight")
    else:
        raise ValueError("Only 'drl' is allowed in this build")

    duration = time.time() - start_time
    print(f"Layout computed in {duration:.2f} seconds.")

    pos = np.array(layout.coords, dtype=np.float32)
    return pos, duration, algorithm


def compute_layout(tokens, graph, algorithm=DEFAULT_ALGORITHM, filter_limit=DEFAULT_FILTER_LIMIT):
    g, degree, graph, filtered, filter_limit = build_igraph(
        tokens,
        graph,
        filter_limit=filter_limit,
    )

    pos, duration, algorithm = get_layout(g, algorithm=algorithm)

    return g, pos, degree, filtered, duration, algorithm, filter_limit

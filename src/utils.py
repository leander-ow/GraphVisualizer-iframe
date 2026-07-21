import os
import requests
from datetime import datetime


def download(url, filename):
    print(f"Downloading {filename}...")
    r = requests.get(url, stream=True)
    r.raise_for_status()
    with open(filename, "wb") as f:
        for chunk in r.iter_content(1024 * 1024):
            f.write(chunk)
    print("Done")


def read_vu8(f):
    value = 0
    shift = 0
    while True:
        b = f.read(1)
        if not b:
            raise EOFError
        b = b[0]
        value |= (b & 0x7F) << shift
        if not (b & 0x80):
            return value
        shift += 7


def get_file_datetime_str(filepath):
    if not os.path.exists(filepath):
        return "Unbekannt"
    mtime = os.path.getmtime(filepath)
    dt = datetime.fromtimestamp(mtime)
    return dt.strftime("%d.%m.%Y %H:%M:%S")

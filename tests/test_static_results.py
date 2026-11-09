import json
from html.parser import HTMLParser
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class SummaryRows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = {}
        self.model = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "tr" and "data-model-id" in attrs:
            self.model = attrs["data-model-id"]
            self.rows[self.model] = []
        if tag == "td" and self.model:
            self.cell = ""

    def handle_data(self, data):
        if self.cell is not None:
            self.cell += data

    def handle_endtag(self, tag):
        if tag == "td" and self.cell is not None:
            self.rows[self.model].append(self.cell)
            self.cell = None
        if tag == "tr":
            self.model = None


class StaticResultsTest(unittest.TestCase):
    def test_summaries_match_default_results(self):
        metadata = json.loads((ROOT / "parallelbench/data/metadata.json").read_text())
        strategies = {s["id"]: s["displayName"] for s in metadata["strategies"]}
        for page in ("chart", "leaderboard"):
            with self.subTest(page=page):
                parser = SummaryRows()
                parser.feed((ROOT / f"parallelbench/{page}/index.html").read_text())
                self.assertEqual(set(parser.rows), {m["id"] for m in metadata["models"]})
                for model in metadata["models"]:
                    data = json.loads((ROOT / f"parallelbench/data/leaderboard/{model['id']}.json").read_text())
                    scores = [(values["75"], strategy) for strategy, values in data["results"].items() if "75" in values]
                    tps, strategy = max(scores)
                    expected = [model["displayName"], strategies[strategy], f"{tps:.2f}"] if tps > 0 else [model["displayName"], "No method meets 75% accuracy", "N/A"]
                    self.assertEqual(parser.rows[model["id"]], expected)

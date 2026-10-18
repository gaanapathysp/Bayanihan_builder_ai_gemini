from google import genai
from google.genai import types
from pydantic import BaseModel
from app.config import GEMINI_API_KEY, FLASH_MODEL

client = genai.Client(api_key=GEMINI_API_KEY)

# Replacement cost bands (PHP) — prototype values
PRICE_TABLE = {
    "television": 25_000, "refrigerator": 30_000, "washing_machine": 20_000,
    "sofa": 18_000, "bed": 15_000, "laptop": 40_000, "desktop_computer": 35_000,
    "air_conditioner": 30_000, "dining_table": 12_000, "microwave": 8_000,
    "cabinet": 10_000, "flooring": 50_000, "ceiling": 40_000, "wall": 20_000,
    "door": 15_000, "window": 12_000, "default": 10_000,
}


class CoverageItem(BaseModel):
    item: str
    damage_description: str
    covered: bool
    clause: str
    exclusion_reason: str | None
    replacement_cost_php: int
    depreciation_php: int
    payable_php: int


class Dossier(BaseModel):
    claim_id: str
    coverage_items: list[CoverageItem]
    gross_damage_php: int
    deductible_php: int
    advance_paid_php: int
    net_payable_php: int
    recommendation: str
    summary: str


POLICY_TEXT = """
BAYANIHAN MUTUAL HOME INSURANCE POLICY (Prototype)

Section 3 — Contents Cover:
3.1 We pay for sudden and accidental physical damage to household contents caused by typhoon wind or flood water entering the home.
3.2 We pay replacement cost less depreciation at 10% per year of age, subject to a minimum of 20% of replacement cost.
3.3 Sub-limit: electronics PHP 80,000. Furniture PHP 60,000. White goods PHP 50,000.

Section 4 — Exclusions:
4.1 Pre-existing damage visible before the insured event.
4.2 Items not listed in the baseline inventory and not supported by a purchase receipt.
4.3 Cash, jewellery, art, and collectibles.
4.4 Motor vehicles (covered under separate motor policy).

Section 5 — Deductible:
5.1 Standard deductible: PHP 5,000 per event.

Section 6 — Claims:
6.1 Claims must be lodged within 30 days of landfall.
6.2 Emergency advance of up to PHP 10,000 is deducted from final settlement.
"""


def build_dossier(claim_id: str, damage_findings: list[dict],
                  advance_paid_php: int, deductible_php: int = 5_000) -> dict:
    """Matches each damage finding to policy clauses and builds the full claim dossier."""
    findings_text = "\n".join(
        f"- {f['room']}: {f['item']} — {f['description']} (confidence {f.get('confidence', 1):.2f})"
        for f in damage_findings if f.get("status") == "new_damage"
    )

    prompt = (
        f"You are a claims AI for Bayanihan Mutual. "
        f"Policy wording:\n{POLICY_TEXT}\n\n"
        f"Damage findings:\n{findings_text}\n\n"
        f"For each damaged item: determine if it is covered under the policy (cite the clause). "
        f"Use the replacement cost table. Apply 10% depreciation per year (assume 3-year-old items). "
        f"Deductible is PHP {deductible_php}. Emergency advance already paid: PHP {advance_paid_php}. "
        f"Calculate net payable. Write a one-line recommendation for the adjuster. "
        f"Claim ID: {claim_id}"
    )

    response = client.models.generate_content(
        model=FLASH_MODEL,
        contents=[prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=Dossier,
            temperature=0.1,
        ),
    )
    return response.parsed.model_dump()


def price_item(item_name: str) -> int:
    """Returns the PHP replacement cost for an item from the price table."""
    key = item_name.lower().replace(" ", "_")
    return PRICE_TABLE.get(key, PRICE_TABLE["default"])

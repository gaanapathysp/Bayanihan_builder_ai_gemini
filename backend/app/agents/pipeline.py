"""
Bayanihan Claim Pipeline
Sequential: (evidence + damage in parallel) → fraud → claims
"""
import os
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "FALSE")

from dotenv import load_dotenv
load_dotenv()

from google.adk.agents import LlmAgent, ParallelAgent, SequentialAgent
from app.config import FLASH_MODEL, GEMINI_API_KEY
from app.tools.evidence import get_weather_history, get_flood_extent, classify_event, verify_location
from app.tools.video import compare_videos, extract_inventory
from app.tools.fraud import check_fraud
from app.tools.claims import build_dossier, price_item
from app.tools.lock import verify_hash

os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY

evidence_agent = LlmAgent(
    name="evidence_agent",
    model=FLASH_MODEL,
    instruction=(
        "You collect independent evidence for a typhoon claim at the insured address. "
        "Use get_weather_history to get rainfall and wind for the event dates. "
        "Use get_flood_extent to check satellite flood presence. "
        "Use classify_event with those results. "
        "Use verify_location to confirm the damage video GPS matches the policy address. "
        "Store all results in session state key 'evidence'."
    ),
    tools=[get_weather_history, get_flood_extent, classify_event, verify_location],
    output_key="evidence",
)

damage_agent = LlmAgent(
    name="damage_agent",
    model=FLASH_MODEL,
    instruction=(
        "You assess property damage from before/after videos. "
        "Use compare_videos with the baseline and damage video paths from session state. "
        "Use price_item to estimate replacement cost for each damaged item. "
        "Store the full damage report in session state key 'damage_report'."
    ),
    tools=[compare_videos, price_item],
    output_key="damage_report",
)

fraud_agent = LlmAgent(
    name="fraud_agent",
    model=FLASH_MODEL,
    instruction=(
        "You run integrity checks on a typhoon claim. "
        "Use check_fraud with the hashes, GPS coordinates, weather data from 'evidence', "
        "and damage findings from 'damage_report'. "
        "Every flag must cite specific evidence. Never accuse — only flag for human review. "
        "Store results in session state key 'fraud_result'."
    ),
    tools=[check_fraud, verify_hash],
    output_key="fraud_result",
)

claims_agent = LlmAgent(
    name="claims_agent",
    model=FLASH_MODEL,
    instruction=(
        "You build the claim dossier for the human adjuster. "
        "Read 'evidence', 'damage_report', and 'fraud_result' from session state. "
        "Use build_dossier to match damage to policy clauses with citations. "
        "Every coverage decision must cite a policy clause number. "
        "Store the complete dossier in session state key 'dossier'."
    ),
    tools=[build_dossier],
    output_key="dossier",
)

claim_pipeline = SequentialAgent(
    name="claim_pipeline",
    sub_agents=[
        ParallelAgent(
            name="gather_evidence",
            sub_agents=[evidence_agent, damage_agent],
        ),
        fraud_agent,
        claims_agent,
    ],
)

"""
Synthetic Group Chat Generator
Generates realistic, messy Hinglish/English group chat logs:
- 4,000+ messages
- 8 participants
- 6-month timeline (Jan 15, 2024 - Jul 15, 2024)
- 3 major concrete decision threads (Manali trip, Goa villa budget, Hackathon architecture)
- 40 ground-truth query answer messages (including >= 8 with ZERO lexical overlap)
- Realistic chatter: typos, one-word replies, forwards, emojis, reactions, time gaps.
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path

SEED = 42
random.seed(SEED)

PARTICIPANTS = [
    {"name": "Aarav", "role": "Organizer / Tech Lead", "style": "decisive, tech-focused, mixed English/Hindi"},
    {"name": "Priya", "role": "Finance / Budget Manager", "style": "numbers, accounts, splitwise, cautious, organized"},
    {"name": "Rohan", "role": "Enthusiastic Planner", "style": "hype man, sends links, travel enthusiast, fast typer"},
    {"name": "Sneha", "role": "Logistics & Skeptic", "style": "asks details, safety, schedules, sanity checks"},
    {"name": "Kabir", "role": "Chill / Spontaneous", "style": "casual, one-word replies, late decisions, slacker vibe"},
    {"name": "Ananya", "role": "Foodie / Photographer", "style": "aesthetic spots, food cafes, pictures, enthusiastic"},
    {"name": "Vikram", "role": "Late-night Coder", "style": "replies at 2 AM, dry humor, pragmatic, code slang"},
    {"name": "Neha", "role": "Creative / Events", "style": "music playlists, games, vibes, emojis, cheerful"},
]

NAMES = [p["name"] for p in PARTICIPANTS]

# Ground Truth Queries & Target Messages embedded deterministically
GROUND_TRUTH_DATA = [
    # --- ZERO LEXICAL OVERLAP (10 Queries) ---
    {
        "id": "q01",
        "category": "zero_lexical_overlap",
        "query": "When was the vacation destination finalized?",
        "target_msg": "chalo Manali fix hai bhai, sab log dates block kar lo May 10-14",
        "sender": "Kabir",
        "target_date": "2024-03-18 20:14",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "Manali was finalized as the vacation destination on March 18, 2024 by Kabir."
    },
    {
        "id": "q02",
        "category": "zero_lexical_overlap",
        "query": "How much money does each person need to transfer for accommodation?",
        "target_msg": "sab log 5k advance GPay kardo mere number pe",
        "sender": "Priya",
        "target_date": "2024-04-22 17:35",
        "thread": "Thread 2: Goa Villa",
        "answer_summary": "Each person needs to pay ₹5,000 advance via GPay to Priya for the stay."
    },
    {
        "id": "q03",
        "category": "zero_lexical_overlap",
        "query": "What programming language and framework was chosen for the server?",
        "target_msg": "Architecture lock: FastAPI backend + React Vite frontend with hybrid BM25 + ONNX vector search, no cloud lock-in",
        "sender": "Aarav",
        "target_date": "2024-06-11 22:40",
        "thread": "Thread 3: Hackathon Project",
        "answer_summary": "FastAPI (Python) backend and React (Vite) frontend were chosen."
    },
    {
        "id": "q04",
        "category": "zero_lexical_overlap",
        "query": "Who will manage all financial accounts and expense splitting?",
        "target_msg": "Priya sambhalegi saara hisaab kitaab, splitwise group create kar diya hai",
        "sender": "Rohan",
        "target_date": "2024-02-08 16:22",
        "thread": "General Logistics",
        "answer_summary": "Priya will handle all accounting and expense splits on Splitwise."
    },
    {
        "id": "q05",
        "category": "zero_lexical_overlap",
        "query": "What time is the group gathering at the bus depot for departure?",
        "target_msg": "Kashmere Gate ISBT pe raat ko 9 baje milna hai sabko, bus 9:45 PM sharp niklegi",
        "sender": "Sneha",
        "target_date": "2024-05-09 18:50",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "The group is assembling at Kashmere Gate ISBT at 9:00 PM."
    },
    {
        "id": "q06",
        "category": "zero_lexical_overlap",
        "query": "Did anyone arrange portable power supplies for the road trip?",
        "target_msg": "Maine do extra 20000mAh battery pack bag me rakh liye hain tension mat lo",
        "sender": "Vikram",
        "target_date": "2024-05-09 21:10",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "Vikram packed two 20000mAh power banks in his bag."
    },
    {
        "id": "q07",
        "category": "zero_lexical_overlap",
        "query": "Was the vacation leave officially approved by leadership?",
        "target_msg": "Manager ne chhutti sign off kardi meri, 5 days off locked in HR portal!",
        "sender": "Neha",
        "target_date": "2024-04-12 11:15",
        "thread": "Leave & Work",
        "answer_summary": "Neha's manager officially signed off on her 5 days of vacation leave."
    },
    {
        "id": "q08",
        "category": "zero_lexical_overlap",
        "query": "Where will the road trip convoy pause for dining on the highway?",
        "target_msg": "Murthal pe rukenge Sukhdev Dhaba pe garam paranthe aur makkhan khane",
        "sender": "Ananya",
        "target_date": "2024-05-09 23:30",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "They will stop at Sukhdev Dhaba in Murthal for paranthas."
    },
    {
        "id": "q09",
        "category": "zero_lexical_overlap",
        "query": "Which database engine was selected to store relational and embedding data?",
        "target_msg": "pgvector hi use karenge relational + vector dono ke liye, separate cluster ka headache nahi chahiye",
        "sender": "Vikram",
        "target_date": "2024-06-12 01:15",
        "thread": "Thread 3: Hackathon Project",
        "answer_summary": "PostgreSQL with pgvector extension was selected for both relational and vector data."
    },
    {
        "id": "q10",
        "category": "zero_lexical_overlap",
        "query": "What is the backup entertainment if bad weather traps everyone indoors?",
        "target_msg": "Monopoly, Catan aur Codenames leke aa raha hoon plus projector for movies",
        "sender": "Rohan",
        "target_date": "2024-05-08 14:05",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "Rohan is bringing board games (Monopoly, Catan, Codenames) and a projector."
    },

    # --- SEMANTIC QUERIES (10 Queries) ---
    {
        "id": "q11",
        "category": "semantic",
        "query": "when did we decide on Manali",
        "target_msg": "chalo Manali fix hai bhai, sab log dates block kar lo May 10-14",
        "sender": "Kabir",
        "target_date": "2024-03-18 20:14",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "Manali was decided on March 18, 2024 around 8:14 PM."
    },
    {
        "id": "q12",
        "category": "semantic",
        "query": "which hotel or cottage was booked in Old Manali",
        "target_msg": "Riverside Alpine Cottage in Old Manali book ho gaya 4 nights ke liye, wooden balconies facing river!",
        "sender": "Rohan",
        "target_date": "2024-03-24 19:12",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "Riverside Alpine Cottage in Old Manali was booked for 4 nights."
    },
    {
        "id": "q13",
        "category": "semantic",
        "query": "what vehicle or transport did we choose to go to Himachal",
        "target_msg": "Volvo semi-sleeper 2x2 book kar li Zingbus se, comfortable rahega overnight",
        "sender": "Aarav",
        "target_date": "2024-04-02 14:20",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "They chose a Volvo semi-sleeper bus booked through Zingbus."
    },
    {
        "id": "q14",
        "category": "semantic",
        "query": "which rental villa was chosen in Goa",
        "target_msg": "Villa Nirvana Anjuna lock kardi, 4BHK with private pool and garden gazebo",
        "sender": "Priya",
        "target_date": "2024-04-21 16:45",
        "thread": "Thread 2: Goa Villa",
        "answer_summary": "Villa Nirvana in Anjuna (4BHK with private pool) was chosen."
    },
    {
        "id": "q15",
        "category": "semantic",
        "query": "how is the hackathon project being deployed",
        "target_msg": "Docker compose ready hai, single command deploy on any 5 dollar VPS or local machine",
        "sender": "Vikram",
        "target_date": "2024-06-18 02:40",
        "thread": "Thread 3: Hackathon Project",
        "answer_summary": "The hackathon project is deployed using Docker Compose on a $5 VPS or local machine."
    },
    {
        "id": "q16",
        "category": "semantic",
        "query": "what cafe did Ananya recommend for breakfast in Manali",
        "target_msg": "Cafe 1947 in Old Manali is mandatory for trout and wood-fired pizza with river view",
        "sender": "Ananya",
        "target_date": "2024-05-02 12:30",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "Ananya recommended Cafe 1947 in Old Manali."
    },
    {
        "id": "q17",
        "category": "semantic",
        "query": "what is our total budget estimate for the Goa trip",
        "target_msg": "Total Goa estimate including flight, villa, scooty and food is approx 22k to 25k per head",
        "sender": "Priya",
        "target_date": "2024-04-19 18:20",
        "thread": "Thread 2: Goa Villa",
        "answer_summary": "The total budget estimate for Goa is ₹22,000 to ₹25,000 per person."
    },
    {
        "id": "q18",
        "category": "semantic",
        "query": "what music playlist or speaker should we bring",
        "target_msg": "JBL Charge 5 main carry kar rahi hoon and curated a 12-hour roadtrip Spotify playlist",
        "sender": "Neha",
        "target_date": "2024-05-07 16:15",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "Neha is bringing a JBL Charge 5 speaker and a 12-hour Spotify playlist."
    },
    {
        "id": "q19",
        "category": "semantic",
        "query": "why did Sneha reject Rishikesh for the vacation",
        "target_msg": "Rishikesh me May me bohot zyada garmi hogi rafting ke alawa time, Manali weather is perfect",
        "sender": "Sneha",
        "target_date": "2024-03-17 21:05",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "Sneha rejected Rishikesh because May would be too hot outside of rafting."
    },
    {
        "id": "q20",
        "category": "semantic",
        "query": "what frontend UI library or styling did we decide for the dashboard",
        "target_msg": "Tailwind CSS with Lucide icons use karenge, no heavy component libraries to keep bundle tiny",
        "sender": "Aarav",
        "target_date": "2024-06-13 19:50",
        "thread": "Thread 3: Hackathon Project",
        "answer_summary": "Tailwind CSS with Lucide icons was decided for styling."
    },

    # --- ATTRIBUTED QUERIES (10 Queries) ---
    {
        "id": "q21",
        "category": "attributed",
        "query": "what did Priya say about the budget",
        "target_msg": "Priya: Guys max 15k per head rakhna Manali trip ka, usse zyada exceeds everyone's monthly savings",
        "sender": "Priya",
        "target_date": "2024-03-16 19:40",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "Priya stated the Manali budget should be capped at ₹15,000 per person."
    },
    {
        "id": "q22",
        "category": "attributed",
        "query": "what did Rohan suggest about booking flights early",
        "target_msg": "Rohan: Goa flights are currently 4.2k on MakeMyTrip, prices will spike past 8k if we delay",
        "sender": "Rohan",
        "target_date": "2024-04-18 13:10",
        "thread": "Thread 2: Goa Villa",
        "answer_summary": "Rohan warned that Goa flights were ₹4,200 and would spike past ₹8,000 if delayed."
    },
    {
        "id": "q23",
        "category": "attributed",
        "query": "what did Sneha say about mountain sickness and medicines",
        "target_msg": "Sneha: I am buying Diamox for altitude sickness, Paracetamol, Vomistop, and ORS sachets for everyone",
        "sender": "Sneha",
        "target_date": "2024-05-06 20:15",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "Sneha is buying Diamox, Paracetamol, Vomistop, and ORS sachets."
    },
    {
        "id": "q24",
        "category": "attributed",
        "query": "what did Vikram mention about API rate limits",
        "target_msg": "Vikram: External embedding APIs have 60 req/min limit, local FastEmbed ONNX will give us unlimited zero-cost inferences",
        "sender": "Vikram",
        "target_date": "2024-06-14 02:10",
        "thread": "Thread 3: Hackathon Project",
        "answer_summary": "Vikram warned about external API rate limits and advocated for local FastEmbed ONNX."
    },
    {
        "id": "q25",
        "category": "attributed",
        "query": "what did Kabir post about bringing warm jackets",
        "target_msg": "Kabir: Rohtang Pass pe minus temperature hoga, Decathlon wali heavy down jacket compulsory hai",
        "sender": "Kabir",
        "target_date": "2024-05-04 18:22",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "Kabir posted that heavy down jackets are compulsory for Rohtang Pass."
    },
    {
        "id": "q26",
        "category": "attributed",
        "query": "what did Ananya say about sunset photography in Goa",
        "target_msg": "Ananya: Thalassa at Siolim or Vagator cliff is unskippable for sunset golden hour photos",
        "sender": "Ananya",
        "target_date": "2024-04-24 15:40",
        "thread": "Thread 2: Goa Villa",
        "answer_summary": "Ananya said Thalassa at Siolim or Vagator cliff is unskippable for golden hour photos."
    },
    {
        "id": "q27",
        "category": "attributed",
        "query": "what did Aarav say about git branching strategy",
        "target_msg": "Aarav: No direct push to main, create feature branches and require 1 approval before merging",
        "sender": "Aarav",
        "target_date": "2024-06-10 18:30",
        "thread": "Thread 3: Hackathon Project",
        "answer_summary": "Aarav mandated feature branches and at least 1 review approval before merging to main."
    },
    {
        "id": "q28",
        "category": "attributed",
        "query": "what did Neha say about renting two-wheelers in Goa",
        "target_msg": "Neha: Scooty rent at Madgaon station is 400 per day, we need 4 Activas for 8 people",
        "sender": "Neha",
        "target_date": "2024-04-25 11:05",
        "thread": "Thread 2: Goa Villa",
        "answer_summary": "Neha noted Activas cost ₹400/day at Madgaon station and 4 are needed."
    },
    {
        "id": "q29",
        "category": "attributed",
        "query": "what did Priya say about grocery shopping for the cottage",
        "target_msg": "Priya: Delhi se hi Maggi packs, chai patti, coffee and snacks leke chalte hain to save resort markup",
        "sender": "Priya",
        "target_date": "2024-05-05 17:50",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "Priya suggested buying Maggi, tea, coffee, and snacks in Delhi to save money."
    },
    {
        "id": "q30",
        "category": "attributed",
        "query": "what did Kabir reply when asked about driving in the hills",
        "target_msg": "Kabir: Hill driving night me risky hai, professional driver wali Volvo is 100x safer than self drive",
        "sender": "Kabir",
        "target_date": "2024-03-29 22:15",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "Kabir stated hill driving at night is risky and Volvo with professional driver is safer."
    },

    # --- TEMPORAL QUERIES (10 Queries) ---
    {
        "id": "q31",
        "category": "temporal",
        "query": "what did we discuss in the third week of March",
        "target_msg": "Voting poll closed: Manali got 6 votes, Goa got 2 votes. Manali wins!",
        "sender": "Aarav",
        "target_date": "2024-03-18 19:30",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "On March 18, the poll closed with Manali winning 6 votes to 2."
    },
    {
        "id": "q32",
        "category": "temporal",
        "query": "what was agreed on April 22 regarding payments",
        "target_msg": "All 8 advance payments of 5000 received on GPay, villa token paid to host Mr. D'Souza",
        "sender": "Priya",
        "target_date": "2024-04-22 21:10",
        "thread": "Thread 2: Goa Villa",
        "answer_summary": "On April 22, Priya confirmed receiving all 8 advance payments and paid the villa token."
    },
    {
        "id": "q33",
        "category": "temporal",
        "query": "what happened on May 10 during the trip",
        "target_msg": "Checked into Riverside Cottage Manali! The view of snow peaks from the lawn is unreal",
        "sender": "Ananya",
        "target_date": "2024-05-10 11:45",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "On May 10, the group checked into Riverside Cottage in Manali."
    },
    {
        "id": "q34",
        "category": "temporal",
        "query": "what was announced on June 11 about the hackathon",
        "target_msg": "Hackathon submission deadline is July 5th, prize pool is 10 Lakhs, team registration done!",
        "sender": "Aarav",
        "target_date": "2024-06-11 11:00",
        "thread": "Thread 3: Hackathon Project",
        "answer_summary": "On June 11, Aarav announced the July 5th deadline and 10 Lakh prize pool."
    },
    {
        "id": "q35",
        "category": "temporal",
        "query": "what did we plan on January 26 holiday",
        "target_msg": "Republic Day brunch at Hauz Khas Social tomorrow at 1 PM, anyone free?",
        "sender": "Neha",
        "target_date": "2024-01-25 20:10",
        "thread": "Social Hangouts",
        "answer_summary": "A Republic Day brunch at Hauz Khas Social was planned for 1 PM."
    },
    {
        "id": "q36",
        "category": "temporal",
        "query": "what cafe visit was shared on Valentine's week in February",
        "target_msg": "Blue Tokai in Khan Market has new hazelnut cold brew, best workspace in central Delhi",
        "sender": "Ananya",
        "target_date": "2024-02-13 15:20",
        "thread": "Food & Cafes",
        "answer_summary": "Ananya shared Blue Tokai in Khan Market with hazelnut cold brew on Feb 13."
    },
    {
        "id": "q37",
        "category": "temporal",
        "query": "what was discussed in late May after returning from Himachal",
        "target_msg": "Manali photo dump Google Drive folder link shared with 450 raw photos, download before Friday",
        "sender": "Rohan",
        "target_date": "2024-05-20 18:40",
        "thread": "Thread 1: Manali Trip",
        "answer_summary": "Rohan shared the Manali Google Drive folder link with 450 photos on May 20."
    },
    {
        "id": "q38",
        "category": "temporal",
        "query": "what was tested on June 28 regarding search performance",
        "target_msg": "BM25 plus embedding hybrid benchmark achieved 94% recall in under 35ms latency!",
        "sender": "Aarav",
        "target_date": "2024-06-28 23:15",
        "thread": "Thread 3: Hackathon Project",
        "answer_summary": "On June 28, hybrid BM25 + embedding achieved 94% recall in under 35ms."
    },
    {
        "id": "q39",
        "category": "temporal",
        "query": "what did we discuss in the first week of July before demo day",
        "target_msg": "Final pitch deck and 2-minute video demo uploaded to submission portal",
        "sender": "Sneha",
        "target_date": "2024-07-04 19:30",
        "thread": "Thread 3: Hackathon Project",
        "answer_summary": "On July 4, the final pitch deck and 2-minute video demo were uploaded."
    },
    {
        "id": "q40",
        "category": "temporal",
        "query": "what celebratory plan was made in mid July",
        "target_msg": "We won 2nd runner up at the hackathon! Celebration dinner at Big Chill Cafe this Saturday 8 PM on me",
        "sender": "Aarav",
        "target_date": "2024-07-12 21:00",
        "thread": "Celebration",
        "answer_summary": "On July 12, Aarav announced winning 2nd runner up and invited everyone to Big Chill Cafe."
    }
]

# Conversational chatter templates for realistic chat dynamics
CHATTER_POOLS = {
    "greetings": [
        "Good morning guysss", "Gm all", "Utho sab", "Morning!!", "Hii guys", "bhai suno",
        "sab gayab ho gaye kya?", "koi zinda hai group me?", "heyyy", "kya chal raha hai",
    ],
    "reactions": [
        "haan", "sahi hai", "lol", "ok", "done", "arre", "wah", "haha", "niceee", "mast",
        "pakka?", "kya baat hai", "100%", "true that", "same here", "lmao", "badhiya",
        "bhai bhai", "bilkul", "hnji", "k", "acha", "cool", "superb", "sorted",
    ],
    "work_rants": [
        "Yaar client ne firse scope badha diya", "production pe bug aa gaya rip weekend",
        "standup me manager ne bohot paka diya", "PR review kardo koi time mile toh",
        "Friday deploy karne se pehle 100 baar socho", "zoom call pe 2 ghante waste ho gaye",
        "wfh me kaam khatam hi nahi hota", "coffee khatam ho gayi brain not working",
    ],
    "food_slang": [
        "Biryani order karein kya aaj?", "Zomato 60% off coupon code chal raha hai",
        "Momos khane chalte hain sham ko", "swiggy instamart se cold drink manga lo",
        "Ghar ka khana is best honestly", "Shawarma craving ho rahi hai bohot gandi",
        "Diet plan kal se pakka start", "chai peene kaun chal raha hai tapri pe?",
    ],
    "hangout_banter": [
        "Weekend plan kya hai batao?", "Netflix pe nayi series aayi hai dekh lo",
        "bhai metro me itni bheed kyun hai aaj", "IPL match kaun dekh raha hai?",
        "CS2 ya Valorant aao raat ko 11 baje", "bhai reels mat bhejo itni saari",
        "splitwise pe hisaab clear karo pehle", "kal subah gym kaun chalega?",
    ],
    "forwards": [
        "Forwarded: Life is 10% what happens to you and 90% how you react to it. Good morning!",
        "Forwarded: WhatsApp will become chargeable from next week unless you forward this to 10 groups lol",
        "Forwarded: Himachal road status: Manali-Leh highway officially open for tourists",
        "Forwarded: Flat 50% discount on flight tickets booking using HDFC credit card code FLY50",
        "Forwarded: Top 10 GitHub repositories every backend developer must star in 2024",
        "Forwarded: Heavy rainfall warning issued for coastal Maharashtra and Goa this weekend",
        "Forwarded: Zomato gold renewal coupon code GOLD2024 valid till midnight",
    ],
    "one_liners": [
        "?", "??", "👍", "🔥", "😂", "🙏🙏", "🙌", "💀", "🫡", "haan bhai", "nahi yaar",
        "dekh ke batata hoon", "5 min me call karta hoon", "driving abhi", "on call",
    ]
}


def generate_chat_corpus(target_count=4150):
    start_dt = datetime(2024, 1, 15, 9, 0, 0)
    end_dt = datetime(2024, 7, 15, 23, 30, 0)
    total_seconds = int((end_dt - start_dt).total_seconds())

    messages = []

    # Step 1: Add all 40 ground truth items with rich contextual immediate replies
    for gt_item in GROUND_TRUTH_DATA:
        gt_dt = datetime.strptime(gt_item["target_date"], "%Y-%m-%d %H:%M")
        messages.append({
            "sender": gt_item["sender"],
            "timestamp": gt_item["target_date"],
            "text": gt_item["target_msg"],
            "thread": gt_item["thread"],
            "is_ground_truth": True,
            "ground_truth_id": gt_item["id"]
        })
        # Add 3-5 immediate contextual responses to simulate real active discussion
        thread_name = gt_item["thread"]
        reply_dt = gt_dt
        for _ in range(random.randint(3, 5)):
            reply_dt += timedelta(minutes=random.randint(1, 4))
            reply_sender = random.choice([n for n in NAMES if n != gt_item["sender"]])
            reply_text = random.choice(CHATTER_POOLS["reactions"] + CHATTER_POOLS["one_liners"])
            messages.append({
                "sender": reply_sender,
                "timestamp": reply_dt.strftime("%Y-%m-%d %H:%M"),
                "text": reply_text,
                "thread": thread_name,
                "is_ground_truth": False
            })

    # Step 2: Fill the remaining messages with realistic chatter distributed across the 6 months
    remaining_needed = target_count - len(messages)
    pool_keys = list(CHATTER_POOLS.keys())

    # Generate random timestamps across the 182 days
    # Weight daytime hours higher than late night
    for _ in range(remaining_needed):
        rand_sec = random.randint(0, total_seconds)
        msg_dt = start_dt + timedelta(seconds=rand_sec)
        hour = msg_dt.hour
        if 2 <= hour < 7 and random.random() > 0.15:
            # Shift late night messages to daytime/evening
            msg_dt = msg_dt.replace(hour=random.randint(9, 23))

        sender = random.choice(NAMES)
        topic = random.choice(pool_keys)
        text = random.choice(CHATTER_POOLS[topic])
        messages.append({
            "sender": sender,
            "timestamp": msg_dt.strftime("%Y-%m-%d %H:%M"),
            "text": text,
            "thread": "General",
            "is_ground_truth": False
        })

    # Step 3: Sort all messages chronologically
    messages.sort(key=lambda m: datetime.strptime(m["timestamp"], "%Y-%m-%d %H:%M"))

    # Step 4: Assign sequential IDs and wire up ground truth target IDs
    gt_map = {gt["id"]: gt for gt in GROUND_TRUTH_DATA}
    for idx, m in enumerate(messages):
        m_id = f"msg_{idx+1:04d}"
        m["id"] = m_id
        if m.get("is_ground_truth"):
            gt_id = m["ground_truth_id"]
            if gt_id in gt_map:
                gt_map[gt_id]["target_message_id"] = m_id

    return messages


def export_whatsapp_text(messages, filepath: Path):
    """
    Exports to official WhatsApp text format:
    '15/01/24, 09:15 - Aarav: Good morning guysss'
    """
    lines = []
    for m in messages:
        dt = datetime.strptime(m["timestamp"], "%Y-%m-%d %H:%M")
        date_str = dt.strftime("%d/%m/%y, %H:%M")
        lines.append(f"{date_str} - {m['sender']}: {m['text']}")
    filepath.write_text("\n".join(lines), encoding="utf-8")


def main():
    data_dir = Path(__file__).resolve().parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    print(f"Generating synthetic chat with seed {SEED}...")
    messages = generate_chat_corpus(target_count=4150)
    print(f"Total messages generated: {len(messages)}")

    # Verify all 40 ground truth queries have exact target_message_id set
    for gt in GROUND_TRUTH_DATA:
        assert "target_message_id" in gt, f"Missing target_message_id for {gt['id']}"
        target_msg = next((m for m in messages if m["id"] == gt["target_message_id"]), None)
        assert target_msg is not None, f"Target message {gt['target_message_id']} not found in corpus!"
        assert target_msg["is_ground_truth"] is True

    # Save JSON corpus
    json_path = data_dir / "synthetic_chat.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "message_count": len(messages),
            "participants": PARTICIPANTS,
            "messages": messages
        }, f, indent=2, ensure_ascii=False)
    print(f"Saved JSON corpus to {json_path}")

    # Save WhatsApp export TXT
    txt_path = data_dir / "WhatsApp_Chat_Export.txt"
    export_whatsapp_text(messages, txt_path)
    print(f"Saved WhatsApp text export to {txt_path}")

    # Save Ground Truth queries
    queries_path = data_dir / "ground_truth_queries.json"
    with open(queries_path, "w", encoding="utf-8") as f:
        json.dump({
            "total_queries": len(GROUND_TRUTH_DATA),
            "zero_lexical_overlap_count": sum(1 for q in GROUND_TRUTH_DATA if q["category"] == "zero_lexical_overlap"),
            "queries": GROUND_TRUTH_DATA
        }, f, indent=2, ensure_ascii=False)
    print(f"Saved ground truth benchmark queries to {queries_path}")


if __name__ == "__main__":
    main()

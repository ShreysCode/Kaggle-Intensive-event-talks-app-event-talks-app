# BigQuery Release Pulse 📊⚡

BigQuery Release Pulse is a modern Flask-based web application that tracks, categorizes, and visualizes Google Cloud BigQuery release notes in real-time. It transforms the unstructured official XML/Atom feed into a structured, searchable, and beautiful user experience.

---

## 🚀 Key Features

- **Granular Feed Parsing**: Utilizes `BeautifulSoup` to break down daily XML feed entries into individual, isolated updates (e.g., *Feature*, *Deprecation*, *Changed*, *Fixed*).
- **Intelligent Caching**: Implements a cache-aside pattern (15-minute TTL) with local JSON storage to optimize performance and prevent rate limiting.
- **Fail-Safe Fallback**: Serves expired cached data as a backup if the upstream Google Cloud feed is down or unreachable.
- **Modern User Interface**: A responsive, premium dark-themed single-page application with:
  - Text search across dates, categories, and descriptions.
  - Interactive category filters.
  - Social sharing integrations (X/Twitter, LinkedIn, Copy Link).
  - Quick-view modal dialogs.
- **JSON REST API**: Exposes structured JSON endpoints for easy integration with external tools or notification bots.

---

## 🛠️ Tech Stack

- **Backend**: Python, Flask, requests, xml.etree.ElementTree, BeautifulSoup4
- **Frontend**: HTML5 (Semantic), CSS3 (Modern custom design system, dark mode, transitions), Vanilla JavaScript (ES6+)
- **API Formats**: JSON, XML/Atom

---

## 📂 Project Structure

```
bq-releases-notes/
├── app.py                # Main Flask application and server entrypoint
├── templates/
│   └── index.html        # Main frontend HTML5 layout
├── static/
│   ├── css/
│   │   └── style.css     # Custom CSS stylesheet (dark-themed UI)
│   └── js/
│       └── app.js        # Frontend client logic & interactive features
├── scratch/              # Development/utility scripts (ignored in git)
├── requirements.txt      # Python dependencies
└── README.md             # Project documentation
```

---

## ⚡ Setup & Installation

### Prerequisites
- Python 3.8 or higher
- Git

### 1. Clone the repository
```bash
git clone https://github.com/ShreysCode/Kaggle-Intensive-event-talks-app-event-talks-app.git
cd Kaggle-Intensive-event-talks-app-event-talks-app
```

### 2. Create and activate a Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```
*(If `requirements.txt` is missing, install the required packages manually: `pip install Flask requests beautifulsoup4`)*

### 4. Run the application
```bash
python app.py
```
The server will start at `http://localhost:5000`.

---

## 🔌 API Endpoints

### Get Release Notes
Retrieves the structured release notes.

* **URL**: `/api/releases`
* **Method**: `GET`
* **Query Parameters**:
  - `force=true` (Optional): Forces a fresh fetch from the Google feed, bypassing the cache.
* **Success Response (200 OK)**:
  ```json
  {
    "status": "success",
    "from_cache": true,
    "count": 42,
    "updates": [
      {
        "id": "a90f12bc8...",
        "date": "June 15, 2026",
        "link": "https://cloud.google.com/bigquery/docs/release-notes",
        "category": "Feature",
        "description_html": "<p>BigQuery now supports...</p>",
        "description_text": "BigQuery now supports..."
      }
    ]
  }
  ```

---

## 📄 License
This project is open-source and available under the MIT License.

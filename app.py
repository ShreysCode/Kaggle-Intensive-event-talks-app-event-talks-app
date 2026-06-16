import os
import json
import hashlib
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify, request
from bs4 import BeautifulSoup

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "releases_cache.json"
CACHE_DURATION_SECS = 900  # 15 minutes

def get_hash(text):
    return hashlib.md5(text.encode('utf-8')).hexdigest()

def fetch_and_parse_feed():
    try:
        response = requests.get(FEED_URL, timeout=10)
        if response.status_code != 200:
            return None, f"Failed to fetch feed: HTTP {response.status_code}"
        
        xml_content = response.content
        root = ET.fromstring(xml_content)
        
        namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = root.findall('atom:entry', namespaces)
        
        all_updates = []
        
        for entry in entries:
            title_tag = entry.find('atom:title', namespaces)
            date_str = title_tag.text if title_tag is not None else "Unknown Date"
            
            link_tag = entry.find('atom:link', namespaces)
            link = link_tag.get('href') if link_tag is not None else ""
            
            content_tag = entry.find('atom:content', namespaces)
            content_html = content_tag.text if content_tag is not None else ""
            
            # Parse inner HTML content
            content_soup = BeautifulSoup(content_html, 'html.parser')
            h3_tags = content_soup.find_all('h3')
            
            if not h3_tags:
                text_desc = content_soup.get_text(strip=True)
                uid = get_hash(f"{date_str}-Update-{text_desc}")
                all_updates.append({
                    'id': uid,
                    'date': date_str,
                    'link': link,
                    'category': 'Update',
                    'description_html': content_html,
                    'description_text': text_desc
                })
                continue
                
            for h3 in h3_tags:
                category = h3.get_text(strip=True)
                
                # Extract all siblings until the next H3 tag
                sibling_content = []
                curr = h3.next_sibling
                while curr and curr.name != 'h3':
                    if curr.name:
                        sibling_content.append(str(curr))
                    elif isinstance(curr, str) and curr.strip():
                        sibling_content.append(f"<p>{curr.strip()}</p>")
                    curr = curr.next_sibling
                
                html_desc = "".join(sibling_content)
                desc_soup = BeautifulSoup(html_desc, 'html.parser')
                text_desc = desc_soup.get_text(strip=True)
                
                uid = get_hash(f"{date_str}-{category}-{text_desc}")
                all_updates.append({
                    'id': uid,
                    'date': date_str,
                    'link': link,
                    'category': category,
                    'description_html': html_desc,
                    'description_text': text_desc
                })
                
        return all_updates, None
    except ET.ParseError as pe:
        return None, f"XML Parsing Error: {pe}"
    except Exception as e:
        return None, f"An error occurred: {str(e)}"

def get_releases(force_refresh=False):
    # Check cache
    if not force_refresh and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                cache_data = json.load(f)
                
            cache_time = cache_data.get('timestamp', 0)
            if time.time() - cache_time < CACHE_DURATION_SECS:
                return cache_data.get('updates', []), True
        except Exception:
            pass  # Fall back to fetching if cache reading fails
            
    # Fetch fresh data
    updates, error = fetch_and_parse_feed()
    if error:
        # If fetch fails, try to return expired cache as backup
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r') as f:
                    cache_data = json.load(f)
                return cache_data.get('updates', []), True
            except Exception:
                pass
        raise Exception(error)
        
    # Write to cache
    try:
        with open(CACHE_FILE, 'w') as f:
            json.dump({
                'timestamp': time.time(),
                'updates': updates
            }, f, indent=2)
    except Exception:
        pass
        
    return updates, False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force_refresh = request.args.get('force', 'false').lower() == 'true'
    try:
        updates, from_cache = get_releases(force_refresh)
        return jsonify({
            'status': 'success',
            'from_cache': from_cache,
            'count': len(updates),
            'updates': updates
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Using 0.0.0.0 so it is accessible from the sandbox environment if needed
    app.run(host='0.0.0.0', port=5000, debug=True)

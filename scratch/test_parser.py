import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup

def test_fetch_and_parse():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Error fetching feed: {response.status_code}")
        return
    
    # Parse XML using ElementTree
    try:
        root = ET.fromstring(response.content)
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return
    
    # Atom namespace
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    
    # Find all entries
    entries = root.findall('atom:entry', namespaces)
    print(f"Found {len(entries)} entries")
    
    all_updates = []
    for entry in entries[:3]: # look at first 3 entries
        title_tag = entry.find('atom:title', namespaces)
        title = title_tag.text if title_tag is not None else "Unknown Date"
        
        # In Atom, link tag could have href attribute
        link_tag = entry.find('atom:link', namespaces)
        link = link_tag.get('href') if link_tag is not None else ""
        
        content_tag = entry.find('atom:content', namespaces)
        content_html = content_tag.text if content_tag is not None else ""
        
        print(f"\n--- Entry: {title} ({link}) ---")
        
        content_soup = BeautifulSoup(content_html, 'html.parser')
        h3_tags = content_soup.find_all('h3')
        
        if not h3_tags:
            print(f"No H3 tags. Full content preview: {content_soup.get_text()[:100]}...")
            all_updates.append({
                'date': title,
                'link': link,
                'category': 'Update',
                'description_html': content_html,
                'description_text': content_soup.get_text(strip=True)
            })
            continue
            
        for h3 in h3_tags:
            category = h3.get_text(strip=True)
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
            
            print(f"[{category}] {text_desc[:120]}...")
            all_updates.append({
                'date': title,
                'link': link,
                'category': category,
                'description_html': html_desc,
                'description_text': text_desc
            })

if __name__ == "__main__":
    test_fetch_and_parse()

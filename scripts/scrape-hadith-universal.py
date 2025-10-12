"""
Universal Hadith Scraper for sunnah.com
Supports all major hadith collections with enhanced metadata for semantic search
"""

import requests
from bs4 import BeautifulSoup
import time
import json
import csv
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict, field
from datetime import datetime
from urllib.parse import urljoin


@dataclass
class Hadith:
    """Comprehensive hadith data structure optimized for semantic search"""
    # Core identifiers
    collection: str  # bukhari, muslim, abudawud, etc.
    collection_name: str  # "Sahih Bukhari", "Sahih Muslim", etc.
    hadith_number: int
    hadith_number_in_book: Optional[int] = None
    reference: str = ""  # Full reference string
    
    # Content
    english_text: str = ""
    arabic_text: str = ""
    
    # Structural metadata
    book_number: int = 0
    book_name: str = ""
    chapter_number: int = 0
    chapter_name: str = ""
    
    # Authentication metadata
    grade: str = ""  # Sahih, Hasan, Daif, etc.
    graded_by: str = ""  # Scholar who graded it
    narrator_chain: str = ""  # Full isnad
    primary_narrator: str = ""  # First narrator (usually companion)
    
    # Thematic metadata
    book_topic: str = ""  # E.g., "Prayer", "Fasting"
    chapter_topic: str = ""
    keywords: List[str] = field(default_factory=list)
    
    # Technical metadata
    source_url: str = ""
    scrape_date: str = ""
    notes: str = ""
    
    # Cross-references (for future enhancement)
    related_quran_verses: List[str] = field(default_factory=list)
    related_hadiths: List[str] = field(default_factory=list)


# Available collections on sunnah.com
HADITH_COLLECTIONS = {
    # 'bukhari': {
    #     'name': 'Sahih Bukhari',
    #     'total_hadiths': 7563,
    #     'books': 97,
    #     'default_grade': 'Sahih'
    # },
    # 'muslim': {
    #     'name': 'Sahih Muslim',
    #     'total_hadiths': 7563,
    #     'books': 56,
    #     'default_grade': 'Sahih'
    # },
    # 'abudawud': {
    #     'name': 'Sunan Abi Dawud',
    #     'total_hadiths': 5274,
    #     'books': 43,
    #     'default_grade': 'Various'
    # },
    # 'tirmidhi': {
    #     'name': 'Jami` at-Tirmidhi',
    #     'total_hadiths': 3956,
    #     'books': 51,
    #     'default_grade': 'Various'
    # },
    # 'nasai': {
    #     'name': "Sunan an-Nasa'i",
    #     'total_hadiths': 5758,
    #     'books': 51,
    #     'default_grade': 'Various'
    # },
    # 'ibnmajah': {
    #     'name': 'Sunan Ibn Majah',
    #     'total_hadiths': 4341,
    #     'books': 37,
    #     'default_grade': 'Various'
    # },
    # 'malik': {
    #     'name': 'Muwatta Malik',
    #     'total_hadiths': 1594,
    #     'books': 61,
    #     'default_grade': 'Various'
    # },
    'riyadussalihin': {
        'name': 'Riyad as-Salihin',
        'total_hadiths': 1896,
        'books': 19,
        'default_grade': 'Sahih'
    },
    # 'nawawi40': {
    #     'name': '40 Hadith Nawawi',
    #     'total_hadiths': 42,
    #     'books': 1,
    #     'default_grade': 'Sahih'
    # },
    # 'bulugh': {
    #     'name': 'Bulugh al-Maram',
    #     'total_hadiths': 1358,
    #     'books': 16,
    #     'default_grade': 'Various'
    # }
}


class HadithScraper:
    """Universal scraper for hadith collections from sunnah.com"""
    
    BASE_URL = "https://sunnah.com"
    
    def __init__(
        self, 
        collection: str,
        delay: float = 0.25,
        output_dir: str = "./data"
    ):
        """
        Initialize scraper
        
        Args:
            collection: Collection key (e.g., 'bukhari', 'muslim')
            delay: Delay between requests in seconds
            output_dir: Directory to save output files
        """
        if collection not in HADITH_COLLECTIONS:
            raise ValueError(
                f"Unknown collection: {collection}. "
                f"Available: {', '.join(HADITH_COLLECTIONS.keys())}"
            )
        
        self.collection = collection
        self.collection_info = HADITH_COLLECTIONS[collection]
        self.delay = delay
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
            'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        })
        
        self.hadiths: List[Hadith] = []
        self.progress_file = self.output_dir / f"{collection}_progress.json"
        self.load_progress()
    
    def load_progress(self):
        """Load previously scraped data"""
        if self.progress_file.exists():
            try:
                with open(self.progress_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.hadiths = [Hadith(**h) for h in data.get('hadiths', [])]
                    print(f"✓ Loaded {len(self.hadiths)} previously scraped hadiths")
            except Exception as e:
                print(f"⚠ Could not load progress: {e}")
    
    def save_progress(self):
        """Save current progress"""
        try:
            with open(self.progress_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'collection': self.collection,
                    'collection_name': self.collection_info['name'],
                    'hadiths': [asdict(h) for h in self.hadiths],
                    'total': len(self.hadiths),
                    'last_updated': datetime.now().isoformat()
                }, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"⚠ Could not save progress: {e}")
    
    def scrape_hadith(self, hadith_num: int) -> Optional[Hadith]:
        """Scrape a single hadith with comprehensive metadata"""
        url = f"{self.BASE_URL}/{self.collection}:{hadith_num}"
        
        try:
            response = self.session.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find the hadith container
            hadith_container = soup.find('div', class_='actualHadithContainer')
            if not hadith_container:
                return None
            
            # Extract English text
            english_div = hadith_container.find('div', class_='text_details')
            english_text = self._clean_text(english_div.get_text() if english_div else "")
            
            # Extract Arabic text
            arabic_div = hadith_container.find('div', class_='arabic_hadith_full')
            arabic_text = self._clean_text(arabic_div.get_text() if arabic_div else "")
            
            # Extract narrator chain
            narrator_div = hadith_container.find('div', class_='hadith_narrated')
            narrator_chain = self._clean_text(narrator_div.get_text() if narrator_div else "")
            
            # Extract primary narrator (usually after "Narrated")
            primary_narrator = ""
            if narrator_chain:
                match = re.search(r'Narrated\s+([^:]+)', narrator_chain)
                if match:
                    primary_narrator = match.group(1).strip()
            
            # Initialize variables
            reference = ""
            hadith_number_in_book = None
            book_number = 0
            
            # Extract reference information from table
            reference_table = soup.find('table', class_='hadith_reference')
            
            if reference_table:
                rows = reference_table.find_all('tr')
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 2:
                        label = cells[0].get_text(strip=True)
                        value = cells[1].get_text(strip=True)
                        
                        # Extract main reference
                        if label == 'Reference':
                            reference = value.replace(':', '').strip()
                        
                        # Extract in-book reference (Book X, Hadith Y)
                        elif 'In-book reference' in label.lower():
                            book_match = re.search(r'Book\s+(\d+)', value)
                            hadith_match = re.search(r'Hadith\s+(\d+)', value)
                            if book_match:
                                book_number = int(book_match.group(1))
                            if hadith_match:
                                hadith_number_in_book = int(hadith_match.group(1))
            
            # Extract book name and chapter information
            book_name = ""
            book_topic = ""
            chapter_name = ""
            chapter_number = 0
            chapter_topic = ""
            
            # Method 1: Look for book_page_english_name in the page (most reliable)
            book_name_div = soup.find('div', class_='book_page_english_name')
            if book_name_div:
                book_name = self._clean_text(book_name_div.get_text())
                book_topic = self._extract_topic(book_name)
                
                # Also get book number from book_page_number if we don't have it yet
                if book_number == 0:
                    book_num_div = soup.find('div', class_='book_page_number')
                    if book_num_div:
                        num_text = book_num_div.get_text(strip=True)
                        num_match = re.search(r'(\d+)', num_text)
                        if num_match:
                            book_number = int(num_match.group(1))
            
            # Method 2: If not found, try breadcrumb
            if not book_name:
                breadcrumb = soup.find('ol', class_='breadcrumb')
                if breadcrumb:
                    crumbs = breadcrumb.find_all('li')
                    if len(crumbs) >= 3:
                        book_elem = crumbs[-3]
                        book_name = self._clean_text(book_elem.get_text())
                        book_topic = self._extract_topic(book_name)
                        
                        # Extract book number from link if still not found
                        if book_number == 0:
                            book_link = book_elem.find('a')
                            if book_link and 'href' in book_link.attrs:
                                match = re.search(r'/(\d+)/?$', book_link['href'])
                                if match:
                                    book_number = int(match.group(1))
            
            # Extract chapter information
            # Method 1: Look for chapter div (appears before hadith on page)
            chapter_div = soup.find('div', class_='chapter')
            if chapter_div:
                # Extract chapter number from echapno
                chapter_num_elem = chapter_div.find(class_='echapno')
                if chapter_num_elem:
                    chap_text = chapter_num_elem.get_text(strip=True)
                    # Extract number from text like "(35)"
                    num_match = re.search(r'\((\d+)\)', chap_text)
                    if num_match:
                        chapter_number = int(num_match.group(1))
                
                # Extract chapter name from englishchapter
                chapter_name_div = chapter_div.find('div', class_='englishchapter')
                if chapter_name_div:
                    chapter_name = self._clean_text(chapter_name_div.get_text())
                    chapter_topic = self._extract_topic(chapter_name)
                    
                    # Remove "Chapter: " prefix if present
                    chapter_name = re.sub(r'^Chapter:\s*', '', chapter_name, flags=re.IGNORECASE)
            
            # Method 2: If not found in chapter div, try page-level elements
            if not chapter_name:
                chapter_num_elem = soup.find(class_='echapno')
                if chapter_num_elem:
                    chap_text = chapter_num_elem.get_text(strip=True)
                    num_match = re.search(r'\((\d+)\)', chap_text)
                    if num_match:
                        chapter_number = int(num_match.group(1))
                
                chapter_name_div = soup.find('div', class_='englishchapter')
                if chapter_name_div:
                    chapter_name = self._clean_text(chapter_name_div.get_text())
                    chapter_topic = self._extract_topic(chapter_name)
                    chapter_name = re.sub(r'^Chapter:\s*', '', chapter_name, flags=re.IGNORECASE)
            
            # Method 3: If still not found, try breadcrumb
            if not chapter_name:
                breadcrumb = soup.find('ol', class_='breadcrumb')
                if breadcrumb:
                    crumbs = breadcrumb.find_all('li')
                    if len(crumbs) >= 4:
                        chapter_elem = crumbs[-2]
                        chapter_name = self._clean_text(chapter_elem.get_text())
                        chapter_topic = self._extract_topic(chapter_name)
            
            # Extract authenticity grade
            grade = self.collection_info['default_grade']
            graded_by = ""
            
            grade_table = soup.find('table', class_='hadith_grading')
            if grade_table:
                grade_rows = grade_table.find_all('tr')
                for row in grade_rows:
                    cells = row.find_all('td')
                    if len(cells) >= 2:
                        scholar = self._clean_text(cells[0].get_text())
                        grade_text = self._clean_text(cells[1].get_text())
                        
                        # Use first grading or prefer Albani
                        if not grade or 'Albani' in scholar:
                            grade = grade_text
                            graded_by = scholar
            
            # Extract keywords from chapter and book names
            keywords = self._extract_keywords(book_name, chapter_name, english_text)
            
            # Create hadith object
            hadith = Hadith(
                collection=self.collection,
                collection_name=self.collection_info['name'],
                hadith_number=hadith_num,
                hadith_number_in_book=hadith_number_in_book,
                reference=reference or f"{self.collection_info['name']} {hadith_num}",
                english_text=english_text,
                arabic_text=arabic_text,
                book_number=book_number,
                book_name=book_name,
                chapter_number=chapter_number,
                chapter_name=chapter_name,
                grade=grade,
                graded_by=graded_by,
                narrator_chain=narrator_chain,
                primary_narrator=primary_narrator,
                book_topic=book_topic,
                chapter_topic=chapter_topic,
                keywords=keywords,
                source_url=url,
                scrape_date=datetime.now().isoformat()
            )
            
            return hadith
        
        except Exception as e:
            print(f"✗ Error scraping hadith {hadith_num}: {e}")
            return None
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        text = text.replace('|', '/')
        return text
    
    def _extract_topic(self, text: str) -> str:
        """Extract main topic from book/chapter name"""
        # Remove "Book of", "Chapter:", numbers, etc.
        topic = re.sub(r'^(Book\s+of|Book\s+\d+:|Chapter:|\d+\s*-)\s*', '', text, flags=re.IGNORECASE)
        topic = topic.split(',')[0]  # Take first part before comma
        return topic.strip()
    
    def _extract_keywords(self, book_name: str, chapter_name: str, text: str) -> List[str]:
        """Extract keywords for semantic search indexing"""
        keywords = set()
        
        # Common Islamic terms to extract
        islamic_terms = [
            'prayer', 'salat', 'fasting', 'ramadan', 'zakah', 'charity',
            'hajj', 'pilgrimage', 'faith', 'belief', 'prophet', 'messenger',
            'quran', 'revelation', 'heaven', 'paradise', 'hell', 'judgment',
            'angel', 'satan', 'worship', 'repentance', 'forgiveness',
            'marriage', 'divorce', 'inheritance', 'jihad', 'knowledge',
            'patience', 'gratitude', 'humility', 'sincerity', 'intention'
        ]
        
        combined_text = f"{book_name} {chapter_name}".lower()
        
        for term in islamic_terms:
            if term in combined_text:
                keywords.add(term)
        
        return sorted(list(keywords))
    
    def scrape_all(self, start_num: int = 1, end_num: Optional[int] = None):
        """Scrape all hadiths in range"""
        if end_num is None:
            end_num = self.collection_info['total_hadiths']
        
        print(f"\n{'='*60}")
        print(f"Scraping: {self.collection_info['name']}")
        print(f"Range: {start_num} to {end_num}")
        print(f"Delay: {self.delay}s between requests")
        print(f"{'='*60}\n")
        
        scraped_numbers = {h.hadith_number for h in self.hadiths}
        success_count = 0
        fail_count = 0
        
        for hadith_num in range(start_num, end_num + 1):
            if hadith_num in scraped_numbers:
                print(f"⊙ Skipping {hadith_num} (already scraped)")
                continue
            
            print(f"→ Scraping hadith {hadith_num}...", end=' ')
            
            hadith = self.scrape_hadith(hadith_num)
            
            if hadith:
                self.hadiths.append(hadith)
                success_count += 1
                print(f"✓ {hadith.reference}")
            else:
                fail_count += 1
                print(f"✗ Failed")
            
            # Save progress every 10 hadiths
            if (success_count + fail_count) % 10 == 0:
                self.save_progress()
                print(f"  → Progress: {len(self.hadiths)} hadiths saved\n")
            
            time.sleep(self.delay)
        
        self.save_progress()
        
        print(f"\n{'='*60}")
        print(f"Scraping Complete!")
        print(f"{'='*60}")
        print(f"Total hadiths: {len(self.hadiths)}")
        print(f"Successful: {success_count}")
        print(f"Failed: {fail_count}")
        print(f"{'='*60}\n")
    
    def export_to_pipe_format(self, filename: Optional[str] = None):
        """Export to pipe-delimited format for embedding"""
        if filename is None:
            filename = f"{self.collection}.txt"
        
        output_file = self.output_dir / filename
        sorted_hadiths = sorted(self.hadiths, key=lambda h: (h.book_number, h.hadith_number))
        
        with open(output_file, 'w', encoding='utf-8') as f:
            for hadith in sorted_hadiths:
                line = f"{hadith.book_number:03d}|{hadith.hadith_number:04d}|{hadith.english_text}\n"
                f.write(line)
        
        print(f"✓ Exported pipe format: {output_file}")
    
    def export_to_json(self, filename: Optional[str] = None):
        """Export full metadata to JSON"""
        if filename is None:
            filename = f"{self.collection}-full.json"
        
        output_file = self.output_dir / filename
        sorted_hadiths = sorted(self.hadiths, key=lambda h: (h.book_number, h.hadith_number))
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'collection': self.collection,
                'collection_name': self.collection_info['name'],
                'total_hadiths': len(sorted_hadiths),
                'export_date': datetime.now().isoformat(),
                'hadiths': [asdict(h) for h in sorted_hadiths]
            }, f, ensure_ascii=False, indent=2)
        
        print(f"✓ Exported JSON: {output_file}")
    
    def export_for_embedding(self, filename: Optional[str] = None):
        """
        Export optimized format for embedding generation
        Each hadith with metadata that will be stored alongside embedding
        """
        if filename is None:
            filename = f"{self.collection}-for-embedding.jsonl"
        
        output_file = self.output_dir / filename
        sorted_hadiths = sorted(self.hadiths, key=lambda h: (h.book_number, h.hadith_number))
        
        with open(output_file, 'w', encoding='utf-8') as f:
            for hadith in sorted_hadiths:
                # Create embedding-optimized record
                record = {
                    'id': f"{self.collection}:{hadith.hadith_number}",
                    'collection': self.collection,
                    'collection_name': hadith.collection_name,
                    'reference': hadith.reference,
                    'text': hadith.english_text,  # Main text for embedding
                    'arabic': hadith.arabic_text,
                    'metadata': {
                        'book_number': hadith.book_number,
                        'book_name': hadith.book_name,
                        'book_topic': hadith.book_topic,
                        'chapter_name': hadith.chapter_name,
                        'chapter_topic': hadith.chapter_topic,
                        'grade': hadith.grade,
                        'graded_by': hadith.graded_by,
                        'narrator': hadith.primary_narrator,
                        'keywords': hadith.keywords,
                        'url': hadith.source_url
                    }
                }
                f.write(json.dumps(record, ensure_ascii=False) + '\n')
        
        print(f"✓ Exported for embedding: {output_file}")


def main():
    """Main execution"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Scrape hadith collections from sunnah.com'
    )
    parser.add_argument(
        'collection',
        choices=list(HADITH_COLLECTIONS.keys()),
        help='Hadith collection to scrape'
    )
    parser.add_argument(
        '--start',
        type=int,
        default=1,
        help='Starting hadith number (default: 1)'
    )
    parser.add_argument(
        '--end',
        type=int,
        help='Ending hadith number (default: collection max)'
    )
    parser.add_argument(
        '--delay',
        type=float,
        default=0.1,
        help='Delay between requests in seconds (default: 0.1)'
    )
    parser.add_argument(
        '--output-dir',
        default='./data',
        help='Output directory (default: ./data)'
    )
    
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print(f"Hadith Scraper - {HADITH_COLLECTIONS[args.collection]['name']}")
    print("="*60)
    
    scraper = HadithScraper(
        collection=args.collection,
        delay=args.delay,
        output_dir=args.output_dir
    )
    
    scraper.scrape_all(start_num=args.start, end_num=args.end)
    
    # Export in all formats
    scraper.export_to_pipe_format()
    scraper.export_to_json()
    scraper.export_for_embedding()
    
    print("\n✅ All exports completed!\n")


if __name__ == "__main__":
    main()

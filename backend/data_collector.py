import requests
import os


class OSDRDownloader:
    def __init__(self, base_url, study_ids, output_dir):
        self.base_url = base_url
        self.study_ids = study_ids
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def fetch_study_files(self, study_id):
        url = f"{self.base_url}/osdr/data/osd/files/{study_id}"
        response = requests.get(url)

        if response.status_code == 200:
            return response.json()
        else:
            print(
                f"Failed to fetch data for study {study_id}: {response.status_code}")
            return None

    def download_file(self, file_info):
        file_name = file_info['file_name']
        remote_url = f"https://osdr.nasa.gov{file_info['remote_url']}"

        file_path = os.path.join(self.output_dir, file_name)
        print(f"Downloading {file_name} from {remote_url}...")

        response = requests.get(remote_url)
        if response.status_code == 200:
            with open(file_path, 'wb') as f:
                f.write(response.content)
            print(f"Saved {file_name} to {file_path}")
        else:
            print(f"Failed to download {file_name}: {response.status_code}")

    def run(self):
        for study_id in self.study_ids:
            study_data = self.fetch_study_files(study_id)
            if study_data:
                for file_info in study_data['studies'][f'OSD-{study_id}']['study_files']:
                    self.download_file(file_info)


if __name__ == "__main__":
    BASE_URL = "https://osdr.nasa.gov"
    STUDY_IDS = ["87", "137"]  # Add more study IDs as needed
    OUTPUT_DIR = "osdr_data"

    downloader = OSDRDownloader(BASE_URL, STUDY_IDS, OUTPUT_DIR)
    downloader.run()

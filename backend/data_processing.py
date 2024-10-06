import json
import requests
import os
from tqdm import tqdm

BASE_URL = "https://osdr.nasa.gov"
MAX_FILE_SIZE = 100 * 1024 * 1024  # 10 MB in bytes


def load_json_data(filename):
    with open(filename, 'r') as f:
        return json.load(f)


def download_file(url, local_filename):
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        total_size = int(r.headers.get('content-length', 0))

        if total_size > MAX_FILE_SIZE:
            print(
                f"Skipping {local_filename}: File size ({total_size / 1024 / 1024:.2f} MB) exceeds 10 MB limit")
            return False

        with open(local_filename, 'wb') as f, tqdm(
            desc=local_filename,
            total=total_size,
            unit='iB',
            unit_scale=True,
            unit_divisor=1024,
        ) as progress_bar:
            for chunk in r.iter_content(chunk_size=8192):
                size = f.write(chunk)
                progress_bar.update(size)
    return True


def main():
    json_file = "nasa_osdr_data.json"  # Replace with your JSON file name
    data = load_json_data(json_file)

    download_dir = "downloaded_files"
    os.makedirs(download_dir, exist_ok=True)

    for study in data:
        for study_id, study_data in study['studies'].items():
            for file_info in study_data['study_files']:
                remote_url = file_info['remote_url']
                file_name = file_info['file_name']
                file_size = file_info['file_size']

                if file_size > MAX_FILE_SIZE:
                    print(
                        f"Skipping {file_name}: File size ({file_size / 1024 / 1024:.2f} MB) exceeds 10 MB limit")
                    continue

                full_url = BASE_URL + remote_url
                local_path = os.path.join(download_dir, file_name)

                print(
                    f"Downloading: {file_name} ({file_size / 1024 / 1024:.2f} MB)")
                try:
                    if download_file(full_url, local_path):
                        print(f"Successfully downloaded: {file_name}")
                    else:
                        print(f"Skipped: {file_name}")
                except Exception as e:
                    print(f"Failed to download {file_name}: {str(e)}")


if __name__ == "__main__":
    main()

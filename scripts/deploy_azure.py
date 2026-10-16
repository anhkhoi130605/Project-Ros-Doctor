#!/usr/bin/env python3
"""
Azure Web App Deployment Script for GitLab CI/CD & Local CLI.
Replicates GitHub Action 'azure/webapps-deploy@v3' by deploying
the combined backend + frontend package to Azure App Service via Kudu ZipDeploy.
"""

import os
import sys
import shutil
import zipfile
import base64
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET


def prepare_package(publish_dir="publish", frontend_dist="WebAPI/FrontEnd(ReactJS)/dist"):
    if not os.path.isdir(publish_dir):
        print(f"[ERROR] Publish directory '{publish_dir}' not found. Please build backend first.")
        sys.exit(1)

    wwwroot_dir = os.path.join(publish_dir, "wwwroot")
    if os.path.isdir(frontend_dist):
        print(f"[INFO] Copying frontend artifacts from '{frontend_dist}' to '{wwwroot_dir}'...")
        os.makedirs(wwwroot_dir, exist_ok=True)
        for item in os.listdir(frontend_dist):
            s = os.path.join(frontend_dist, item)
            d = os.path.join(wwwroot_dir, item)
            if os.path.isdir(s):
                if os.path.exists(d):
                    shutil.rmtree(d)
                shutil.copytree(s, d)
            else:
                shutil.copy2(s, d)
        print("[INFO] Frontend successfully integrated into backend wwwroot.")
    else:
        print(f"[WARN] Frontend dist directory '{frontend_dist}' not found; deploying backend only.")

    zip_path = "publish.zip"
    print(f"[INFO] Compressing '{publish_dir}' to '{zip_path}'...")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(publish_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, publish_dir)
                zipf.write(full_path, rel_path)

    zip_size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"[INFO] Deployment zip created: {zip_path} ({zip_size_mb:.2f} MB)")
    return zip_path


def parse_publish_profile(profile_xml):
    try:
        root = ET.fromstring(profile_xml)
    except Exception as e:
        print(f"[ERROR] Failed to parse publish profile XML: {e}")
        sys.exit(1)

    selected = None
    for profile in root.iter("publishProfile"):
        if profile.get("publishMethod") == "ZipDeploy":
            selected = profile
            break

    if selected is None:
        for profile in root.iter("publishProfile"):
            method = profile.get("publishMethod", "")
            username = profile.get("userName", "")
            if method == "MSDeploy" or username.startswith("$"):
                selected = profile
                break

    if selected is None:
        profiles = list(root.iter("publishProfile"))
        if profiles:
            selected = profiles[0]

    if selected is None:
        print("[ERROR] No valid publishProfile element found in publish profile XML.")
        sys.exit(1)

    publish_url = selected.get("publishUrl", "")
    scm_host = publish_url.split(":")[0] if publish_url else None
    user_name = selected.get("userName")
    user_pwd = selected.get("userPWD")

    return scm_host, user_name, user_pwd


def zip_directory(source_dir, output_zip):
    if not os.path.isdir(source_dir):
        print(f"[ERROR] Directory '{source_dir}' not found.")
        sys.exit(1)
    print(f"[INFO] Compressing '{source_dir}' to '{output_zip}'...")
    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(source_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, source_dir)
                zipf.write(full_path, rel_path)
    zip_size_mb = os.path.getsize(output_zip) / (1024 * 1024)
    print(f"[INFO] Archive created: {output_zip} ({zip_size_mb:.2f} MB)")
    return output_zip


def deploy_to_azure(zip_path, profile_env_vars=None, default_app_name="CtrlShiftN"):
    candidate_vars = profile_env_vars or [
        "AZURE_PUBLISH_PROFILE",
        "AZUREAPPSERVICE_PUBLISHPROFILE",
        "AZUREAPPSERVICE_PUBLISHPROFILE_4CAF0059E81E48D690CA5E536CA48760",
    ]
    profile_xml = None
    for var in candidate_vars:
        val = os.environ.get(var)
        if val:
            profile_xml = val
            break

    scm_host = None
    user_name = None
    user_pwd = None

    if profile_xml:
        print("[INFO] Found Azure Publish Profile XML. Extracting credentials...")
        scm_host, user_name, user_pwd = parse_publish_profile(profile_xml)
    else:
        scm_host = os.environ.get("AZURE_SCM_HOST")
        user_name = os.environ.get("AZURE_PUBLISH_USERNAME")
        user_pwd = os.environ.get("AZURE_PUBLISH_PASSWORD")

    app_name = os.environ.get("AZURE_APP_NAME", default_app_name)
    slot_name = os.environ.get("AZURE_SLOT_NAME", "Production")

    if not scm_host:
        if slot_name.lower() in ["production", ""]:
            scm_host = f"{app_name}.scm.azurewebsites.net"
        else:
            scm_host = f"{app_name}-{slot_name}.scm.azurewebsites.net"

    if not user_name or not user_pwd:
        print("[ERROR] Missing Azure credentials!")
        print(f"Please set one of {candidate_vars} in CI/CD Variables.")
        sys.exit(1)

    print(f"[INFO] Using deployment username: '{user_name}' (password length: {len(user_pwd) if user_pwd else 0})")

    deploy_url = f"https://{scm_host}/api/zipdeploy"
    print(f"[INFO] Target: App '{app_name}' (Slot: '{slot_name}')")
    print(f"[INFO] Deploying to Kudu endpoint: {deploy_url}")

    auth_str = f"{user_name}:{user_pwd}"
    auth_header = "Basic " + base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

    with open(zip_path, "rb") as f:
        zip_data = f.read()

    req = urllib.request.Request(
        deploy_url,
        data=zip_data,
        headers={
            "Authorization": auth_header,
            "Content-Type": "application/octet-stream",
        },
        method="POST"
    )

    try:
        print("[INFO] Uploading package to Azure App Service (this may take a few minutes)...")
        with urllib.request.urlopen(req, timeout=600) as response:
            status = response.status
            body = response.read().decode("utf-8", errors="ignore")
            print(f"[SUCCESS] HTTP Status: {status}")
            if body:
                print(f"[AZURE RESPONSE]\n{body}")
            print("=======================================================")
            print(f" Deployment to Azure Web App '{app_name}' SUCCESSFUL! ")
            print("=======================================================")
    except urllib.error.HTTPError as e:
        print(f"[ERROR] Azure deployment failed with HTTP {e.code}: {e.reason}")
        err_body = e.read().decode("utf-8", errors="ignore")
        print(f"[AZURE ERROR DETAILS]\n{err_body}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Deployment request failed: {e}")
        sys.exit(1)


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--python":
        publish_dir = "python-ai-publish"
        zip_path = zip_directory(publish_dir, "python_publish.zip")
        os.environ["AZURE_APP_NAME"] = "ctrlshiftn-agent"
        deploy_to_azure(
            zip_path,
            profile_env_vars=[
                "AZURE_AI_PUBLISH_PROFILE",
                "AZUREAPPSERVICE_AI_PUBLISHPROFILE",
            ],
            default_app_name="ctrlshiftn-agent",
        )
    else:
        zip_path = prepare_package()
        deploy_to_azure(zip_path)


if __name__ == "__main__":
    main()

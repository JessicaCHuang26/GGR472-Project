import pandas as pd
import geojson

# -----------------------------
# SETTINGS
# -----------------------------

YEAR_FILTER = 2022

weights = {
    "assault": 3,
    "robbery": 4,
    "shooting": 5,
    "collision": 2,
    "pedestrian_ksi": 4
}

# -----------------------------
# LOAD DATASETS
# -----------------------------

assault = pd.read_csv("data/raw/Assault_Open_Data_8153726331132086508.csv")
robbery = pd.read_csv("data/raw/Robbery_Open_Data_1445483808884001275.csv")
shooting = pd.read_csv("data/raw/Shooting_and_Firearm_Discharges_Open_Data_2111862734334998593.csv")
collisions = pd.read_csv("data/raw/Traffic_Collisions_Open_Data_2053198073974531286.csv")
pedestrian = pd.read_csv("data/raw/PEDESTRIAN_KSI_-5545556265101454964.csv")


# -----------------------------
# CLEAN FUNCTION
# -----------------------------

def clean_dataset(df, lon_col, lat_col, year_col, incident_type):

    df = df[[lon_col, lat_col, year_col]].copy()

    df.columns = ["longitude", "latitude", "year"]

    df = df.dropna(subset=["longitude", "latitude"])

    df = df[(df["longitude"] != 0) & (df["latitude"] != 0)]

    df = df[df["year"] >= YEAR_FILTER]

    df["type"] = incident_type
    df["weight"] = weights[incident_type]

    return df


# -----------------------------
# CLEAN EACH DATASET
# -----------------------------

assault_clean = clean_dataset(
    assault,
    "LONG_WGS84",
    "LAT_WGS84",
    "OCC_YEAR",
    "assault"
)

robbery_clean = clean_dataset(
    robbery,
    "LONG_WGS84",
    "LAT_WGS84",
    "OCC_YEAR",
    "robbery"
)

shooting_clean = clean_dataset(
    shooting,
    "LONG_WGS84",
    "LAT_WGS84",
    "OCC_YEAR",
    "shooting"
)

collisions_clean = clean_dataset(
    collisions,
    "LONG_WGS84",
    "LAT_WGS84",
    "OCC_YEAR",
    "collision"
)

pedestrian["DATE"] = pd.to_datetime(pedestrian["DATE"])
pedestrian["year"] = pedestrian["DATE"].dt.year

pedestrian_clean = clean_dataset(
    pedestrian,
    "LONGITUDE",
    "LATITUDE",
    "year",
    "pedestrian_ksi"
)

# -----------------------------
# MERGE ALL INCIDENTS
# -----------------------------

all_incidents = pd.concat([
    assault_clean,
    robbery_clean,
    shooting_clean,
    collisions_clean,
    pedestrian_clean
])

print("Total incidents:", len(all_incidents))


# -----------------------------
# EXPORT CSV
# -----------------------------

all_incidents.to_csv("toronto_incidents_cleaned.csv", index=False)


# -----------------------------
# CONVERT TO GEOJSON
# -----------------------------

features = []

for _, row in all_incidents.iterrows():

    feature = geojson.Feature(
        geometry=geojson.Point((row["longitude"], row["latitude"])),
        properties={
            "type": row["type"],
            "weight": row["weight"]
        }
    )

    features.append(feature)


feature_collection = geojson.FeatureCollection(features)

with open("toronto_incidents.geojson", "w") as f:
    geojson.dump(feature_collection, f)


print("GeoJSON created: toronto_incidents.geojson")
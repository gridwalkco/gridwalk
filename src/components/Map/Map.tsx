import React, { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  MapProps,
  TokenData,
  FeatureCollectionWithCRS,
  INITIAL_VIEW_STATE,
  handleError,
  fetchToken,
  getValidToken,
  transformGeoJsonData,
} from "../../utils/mapHandler";

// Form Component to change paint properties
const LayerStyleForm: React.FC<{
  layerId: string;
  onSave: (
    fillColor: string,
    fillOpacity: number,
    fillOutlineColor: string,
  ) => void;
}> = ({ layerId, onSave }) => {
  const [fillColor, setFillColor] = useState("#FF0000");
  const [fillOpacity, setFillOpacity] = useState(0.5);
  const [fillOutlineColor, setFillOutlineColor] = useState("#00FF00");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(fillColor, fillOpacity, fillOutlineColor);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="layer-style-form"
      style={{
        position: "fixed",
        top: 5,
        left: 350,
        background: "white",
        padding: "10px",
        border: "1px solid #ccc",
        zIndex: 10,
      }}
    >
      <h3>Edit Layer Style: {layerId}</h3>
      <div>
        <label>Fill Color:</label>
        <input
          type="color"
          value={fillColor}
          onChange={(e) => setFillColor(e.target.value)}
        />
      </div>
      <div>
        <label>Fill Opacity:</label>
        <input
          type="number"
          step="0.1"
          min="0"
          max="1"
          value={fillOpacity}
          onChange={(e) => setFillOpacity(Number(e.target.value))}
        />
      </div>
      <div>
        <label>Fill Outline Color:</label>
        <input
          type="color"
          value={fillOutlineColor}
          onChange={(e) => setFillOutlineColor(e.target.value)}
        />
      </div>
      <button type="submit">Save</button>
    </form>
  );
};

// Initialize the map
const initMap = async (
  mapContainer: React.RefObject<HTMLDivElement>,
  baseLayer: string,
  setMapLoaded: React.Dispatch<React.SetStateAction<boolean>>,
  getValidToken: () => Promise<string | null>,
  setMapError: React.Dispatch<React.SetStateAction<string | null>>,
  map: React.MutableRefObject<maplibregl.Map | null>,
  tokenDataRef: React.MutableRefObject<TokenData | null>,
  setSelectedLayer: React.Dispatch<React.SetStateAction<string | null>>,
) => {
  if (!mapContainer.current) return;

  try {
    await getValidToken();

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: baseLayer,
      center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
      zoom: INITIAL_VIEW_STATE.zoom,
      minZoom: 6,
      maxBounds: [
        [-10.7, 49.5], // Southwest coordinates
        [1.9, 61.0], // Northeast coordinates
      ],
      transformRequest: (url) => {
        if (url.startsWith("https://api.os.uk")) {
          return {
            url: url,
            headers: {
              Authorization: `Bearer ${tokenDataRef.current?.access_token || ""}`,
              "Content-Type": "application/json",
            },
          };
        } else if (url.startsWith(window.location.origin)) {
          return {
            url: url,
            credentials: "same-origin" as const,
          };
        }
      },
    });

    map.current.on("load", () => setMapLoaded(true));
    map.current.on("styledata", () =>
      console.log("New style loaded:", baseLayer),
    );

    map.current.on("error", (e) =>
      handleError(setMapError, e.error, "Map error"),
    );

    // Add click listener for layers to open the style form
    map.current.on("click", (e) => {
      const features = map.current?.queryRenderedFeatures(e.point);
      if (features && features.length > 0) {
        const clickedLayerId = features[0].layer.id;
        if (clickedLayerId.startsWith("geojson-layer-")) {
          setSelectedLayer(clickedLayerId);
        }
      }
    });
  } catch (error) {
    handleError(setMapError, error as Error, "Error initializing map");
  }
};

// MAIN MAP COMPONENT
const Map: React.FC<MapProps> = ({ activeFiles, baseLayer }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const tokenDataRef = useRef<TokenData | null>(null);
  const tokenPromiseRef = useRef<Promise<string | null> | null>(null);

  // Initialize map on component mount
  useEffect(() => {
    initMap(
      mapContainer,
      baseLayer,
      setMapLoaded,
      () =>
        getValidToken(fetchToken, tokenDataRef, tokenPromiseRef, setMapError),
      setMapError,
      map,
      tokenDataRef,
      setSelectedLayer,
    );

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [baseLayer]);

  // Adds locally uploaded Geojsons to the map
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove layers for files that are no longer active
    map.current.getStyle().layers.forEach((layer) => {
      if (
        layer.id.startsWith("geojson-layer-") &&
        !activeFiles.includes(layer.id.replace("geojson-layer-", ""))
      ) {
        map.current?.removeLayer(layer.id);
        map.current?.removeSource(layer.id.replace("layer", "source"));
      }
    });

    activeFiles.forEach((fileName) => {
      if (!map.current?.getSource(`geojson-source-${fileName}`)) {
        const geojsonData = localStorage.getItem(`file:${fileName}`);

        if (geojsonData) {
          try {
            const parsedData = JSON.parse(
              geojsonData,
            ) as FeatureCollectionWithCRS;
            const transformedData = transformGeoJsonData(parsedData);

            console.log(
              "First feature coordinates after transformation:",
              transformedData.features[0].geometry,
            );

            map.current?.addSource(`geojson-source-${fileName}`, {
              type: "geojson",
              data: transformedData,
            });

            map.current?.addLayer({
              id: `geojson-layer-${fileName}`,
              type: "fill",
              source: `geojson-source-${fileName}`,
              paint: {
                "fill-color": "#FF0000",
                "fill-opacity": 0.5,
                "fill-outline-color": "#00FF00",
              },
            });
          } catch (error) {
            console.error(
              `Error processing GeoJSON data for file ${fileName}:`,
              error,
            );
          }
        } else {
          console.error(`No data found in localStorage for file: ${fileName}`);
        }
      }
    });
  }, [activeFiles, mapLoaded]);

  // Function to update the layer's paint properties
  const updateLayerStyle = (
    fillColor: string,
    fillOpacity: number,
    fillOutlineColor: string,
  ) => {
    if (map.current && selectedLayer) {
      map.current.setPaintProperty(selectedLayer, "fill-color", fillColor);
      map.current.setPaintProperty(selectedLayer, "fill-opacity", fillOpacity);
      map.current.setPaintProperty(
        selectedLayer,
        "fill-outline-color",
        fillOutlineColor,
      );
      setSelectedLayer(null); // Close the form after applying changes
    }
  };

  // Return the map container, error message if any, and the style form if a layer is selected
  return (
    <>
      <div
        ref={mapContainer}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      />
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-75">
          <p className="text-red-700 font-bold">{mapError}</p>
        </div>
      )}
      {selectedLayer && (
        <LayerStyleForm layerId={selectedLayer} onSave={updateLayerStyle} />
      )}
    </>
  );
};

export default React.memo(Map);

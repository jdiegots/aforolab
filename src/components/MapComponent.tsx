// src/components/MapComponent.tsx
"use client";

import React, { useEffect, useState } from "react";
import { feature } from "topojson-client";
import { getTeamSlug, TEAM_MAPPINGS } from "../utils/teamMappings";
import { formatNumber } from "../utils/formatNumber";
import {
    ComposableMap,
    Geographies,
    Geography,
    Marker,
} from "react-simple-maps";
import { Search } from "lucide-react";

interface MapProps {
    stadiums?: any[];
    onStadiumClick?: (stadium: any) => void;
    showStadiumList?: boolean;
}

// Ruta pública al GeoJSON (en /public/data)
const SPAIN_MAP_URL = "/data/spain_map.json";

type SpainGeoJSON = {
    type: "FeatureCollection";
    features: any[];
};

// Componente de renderizado de mapa (definido fuera para evitar re-montajes)
const MapRender = ({
    geoData,
    pointData,
    center,
    scale,
    onHover,
    hoveredStadium,
    isInset = false,
    isMobile = false
}: {
    geoData: any;
    pointData: any[];
    center: [number, number];
    scale: number;
    onHover: (s: any) => void;
    hoveredStadium: any | null;
    isInset?: boolean;
    isMobile?: boolean;
}) => (
    <ComposableMap
        projection="geoMercator"
        projectionConfig={{
            center: center,
            scale: scale,
        }}
        style={{ width: "100%", height: "100%" }}
    >
        <Geographies geography={geoData}>
            {({ geographies }) =>
                geographies.map((geo) => (
                    <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        style={{
                            default: {
                                fill: "transparent",
                                stroke: "#ffffff",
                                strokeWidth: 0.5,
                                outline: "none",
                            },
                            hover: {
                                fill: "transparent",
                                stroke: "#ffffff",
                                strokeWidth: 0.5,
                                outline: "none",
                            },
                            pressed: {
                                fill: "transparent",
                                stroke: "#ffffff",
                                strokeWidth: 0.5,
                                outline: "none",
                            },
                        }}
                    />
                ))
            }
        </Geographies>

        {pointData.map((stadium, index) => {
            const isHovered = hoveredStadium?.stadium_name === stadium.stadium_name;

            // Las Palmas es más grande
            const isLasPalmas = stadium.team_primary?.toLowerCase().includes("palmas") ||
                stadium.stadium_name?.toLowerCase().includes("palmas");

            // Base radius: Normal = 5, Las Palmas = 12 (much larger)
            const baseRadius = isLasPalmas && !isMobile ? 16 : 5;
            const radius = isHovered ? baseRadius * 1.5 : baseRadius;

            return (
                <Marker key={index} coordinates={[stadium.lng, stadium.lat]}>
                    <g
                        className="cursor-pointer transition-all duration-200"
                        onMouseEnter={isMobile ? undefined : () => onHover(stadium)}
                        onMouseLeave={isMobile ? undefined : () => onHover(null)}
                        onClick={() => onHover(stadium)}
                    >
                        {/* Dot marker */}
                        <circle
                            r={radius}
                            fill={TEAM_MAPPINGS[stadium.team_primary || stadium.team || stadium.team_name || ""]?.colors?.[0] || "#ffffff"}
                            stroke="#ffffff"
                            strokeWidth={isLasPalmas ? 2 : 1}
                            style={{
                                transition: "all 0.2s ease",
                                filter: isHovered ? "drop-shadow(0 0 6px rgba(255,255,255,0.9))" : "drop-shadow(0 1px 2px rgba(0,0,0,0.5))"
                            }}
                        />
                    </g>
                </Marker>
            );
        })}
    </ComposableMap>
);

export const MapComponent: React.FC<MapProps> = ({ stadiums: propStadiums, onStadiumClick, showStadiumList = true }) => {
    const [spainGeo, setSpainGeo] = useState<SpainGeoJSON | null>(null);
    const [mapData, setMapData] = useState<any[]>([]);
    const [hovered, setHovered] = useState<any | null>(null);
    const [hoveredFromList, setHoveredFromList] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isMobile, setIsMobile] = useState(false);
    const [dataError, setDataError] = useState<string | null>(null);

    useEffect(() => {
        const handleResize = () => {
            if (typeof window !== "undefined") {
                setIsMobile(window.innerWidth < 768);
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Cargar datos
    useEffect(() => {
        const loadData = async () => {
            setDataError(null);
            try {
                // Always load map
                const geoRes = await fetch(SPAIN_MAP_URL);
                const rawGeo = await geoRes.json();

                const isObject = rawGeo && typeof rawGeo === "object" && !Array.isArray(rawGeo);
                const hasFeaturesArray = Array.isArray(rawGeo?.features);
                const hasObjects = isObject && rawGeo.type === "Topology" &&
                    rawGeo.objects && typeof rawGeo.objects === "object" && !Array.isArray(rawGeo.objects);

                if (!isObject || (!hasFeaturesArray && !hasObjects)) {
                    console.error("El mapa de España no tiene el formato esperado", rawGeo);
                    setDataError("No se pudo cargar el mapa de España.");
                    setSpainGeo(null);
                    setMapData([]);
                    return;
                }

                let filtered: SpainGeoJSON = { type: "FeatureCollection", features: [] };

                if (hasFeaturesArray) {
                    filtered = {
                        type: "FeatureCollection",
                        features: rawGeo.features.filter(
                            (f: any) => f.properties?.year === "2022"
                        ),
                    };

                    if (filtered.features.length === 0) {
                        filtered = rawGeo;
                    }
                } else if (hasObjects) {
                    const objectKeys = Object.keys(rawGeo.objects || {});
                    const primaryObjectKey = objectKeys[0];

                    if (!primaryObjectKey) {
                        filtered = { type: "FeatureCollection", features: [] };
                    } else {
                        const topoObject = rawGeo.objects[primaryObjectKey];
                        const converted = feature(rawGeo, topoObject) as SpainGeoJSON;

                        filtered = {
                            type: "FeatureCollection",
                            features: Array.isArray(converted.features) ? converted.features : [],
                        };
                    }
                }

                setSpainGeo(filtered);

                if (propStadiums) {
                    setMapData(propStadiums);
                } else {
                    const [dataRes, popRes, coordsRes] = await Promise.all([
                        fetch("/data/stadium_full_data.json"),
                        fetch("/data/stadium_populations.json"),
                        fetch("/data/stadium_coords.json")
                    ]);

                    const rawData = await dataRes.json();
                    const popData = await popRes.json().catch(() => ({}));
                    const coordsData = await coordsRes.json();

                    const isPlainObject = (value: any) =>
                        value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

                    const safeRawData = Array.isArray(rawData) ? rawData : [];
                    const safeCoordsData = Array.isArray(coordsData) ? coordsData : [];
                    const safePopData = isPlainObject(popData) ? popData : {};

                    let foundDataIssue = false;

                    if (!Array.isArray(rawData)) {
                        console.error("stadium_full_data no tiene el formato esperado (array)", rawData);
                        foundDataIssue = true;
                    }

                    if (!Array.isArray(coordsData)) {
                        console.error("stadium_coords no tiene el formato esperado (array)", coordsData);
                        foundDataIssue = true;
                    }

                    if (!isPlainObject(popData)) {
                        console.error("stadium_populations no tiene el formato esperado (objeto plano)", popData);
                    }

                    if (foundDataIssue) {
                        setDataError("Los datos de estadios no están disponibles en este momento.");
                        setMapData([]);
                        return;
                    }

                    // Create a map of coordinates by stadium name
                    const coordsMap = new Map();
                    if (safeCoordsData.length > 0) {
                        safeCoordsData.forEach((coord: any) => {
                            coordsMap.set(coord.stadium_name, { lat: coord.lat, lng: coord.lng });
                        });
                    }

                    // Merge population data and coordinates
                    const mergedData = safeRawData.length > 0
                        ? safeRawData.map((s: any) => {
                            const pop = safePopData?.[s.stadium_name];
                            const coords = coordsMap.get(s.stadium_name);

                            return {
                                ...s,
                                lat: coords?.lat ?? s.lat ?? 0,
                                lng: coords?.lng ?? s.lng ?? 0,
                                pop_muni: pop?.pop_muni ?? s.pop_muni,
                                pop_prov: pop?.pop_prov ?? s.pop_prov,
                                pop_ccaa: pop?.pop_ccaa ?? s.pop_ccaa,
                                municipality: pop?.municipality ?? s.municipality,
                                province: pop?.province ?? s.province,
                                ccaa: pop?.ccaa ?? s.ccaa
                            };
                        })
                        : [];

                    if (mergedData.length === 0) {
                        setDataError("No hay datos disponibles para mostrar el mapa de estadios.");
                        setMapData([]);
                        return;
                    }

                    setMapData(mergedData);
                }
            } catch (err) {
                console.error("Error cargando datos", err);
            }
        };

        loadData();
    }, [propStadiums]);

    const handleMapHover = (stadium: any) => {
        setHovered(stadium);
        setHoveredFromList(null);
    };

    const handleListHover = (stadium: any) => {
        setHoveredFromList(stadium);
        setHovered(null);
    };

    if (dataError) {
        return (
            <div className="w-full h-[500px] flex items-center justify-center bg-black text-white/70 text-center px-4">
                {dataError}
            </div>
        );
    }

    if (!spainGeo) {
        return (
            <div className="w-full h-[500px] flex items-center justify-center bg-black" />
        );
    }

    const peninsulaFeatures = spainGeo.features.filter((f: any) => f.properties.acom_name !== "Canarias");
    const canariasFeatures = spainGeo.features.filter((f: any) => f.properties.acom_name === "Canarias");

    const peninsulaGeo = { type: "FeatureCollection", features: peninsulaFeatures };
    const canariasGeo = { type: "FeatureCollection", features: canariasFeatures };

    const isCanary = (s: any) => s.lat < 35;
    const peninsulaStadiums = mapData.filter((s) => !isCanary(s));
    const canaryStadiums = mapData.filter((s) => isCanary(s));

    // Filtrar estadios según búsqueda
    const filteredStadiums = mapData.filter(s =>
        s.stadium_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.team_primary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.municipality?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // El estadio destacado puede venir del mapa o de la lista
    const highlightedStadium = hovered || hoveredFromList;

    const shouldShowList = showStadiumList !== false;

    return (
        <div
            className={`w-full min-h-[420px] md:min-h-[520px] lg:h-[600px] relative ${shouldShowList ? "flex gap-4" : ""}`}
        >
            {/* Mapa */}
            <div
                className={shouldShowList
                    ? "flex-1 relative flex items-start justify-center"
                    : "w-full h-full relative flex items-start justify-center"}
            >
                {/* Mapa Península + Baleares */}
                <div className="w-full h-full">
                    <MapRender
                        geoData={peninsulaGeo}
                        pointData={peninsulaStadiums}
                        center={[-3, 39.5]}
                        scale={isMobile ? 2600 : 2200}
                        onHover={handleMapHover}
                        hoveredStadium={highlightedStadium}
                        isMobile={isMobile}
                    />
                </div>

                {/* Mapa Canarias (Inset) */}
                <div
                    className={`${
                        isMobile
                            ? "relative mt-3 w-40 h-28"
                            : "absolute bottom-4 left-4 w-48 h-32"
                    } border border-white/10 bg-black/80 rounded-lg overflow-hidden shadow-lg`}
                >
                    <MapRender
                        geoData={canariasGeo}
                        pointData={canaryStadiums}
                        center={[-15.5, 28.5]}
                        scale={isMobile ? 6200 : 5500}
                        onHover={handleMapHover}
                        hoveredStadium={highlightedStadium}
                        isInset={true}
                        isMobile={isMobile}
                    />
                </div>

                {/* Fixed Tooltip - SOLO cuando se pasa por el mapa */}
                {hovered && (
                    <div className="absolute top-4 left-4 bg-black/90 backdrop-blur-md border border-white/20 rounded-2xl p-4 w-[320px] shadow-2xl z-50 pointer-events-auto">
                        <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                            {hovered.stadium_name}
                        </div>
                        <div className="text-lg font-bold text-white mb-3">
                            {hovered.team_primary}
                        </div>

                        <div className="space-y-3 text-sm">
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-white/50 text-xs">Asistencia Media</span>
                                    <span className="text-white font-mono">{formatNumber(hovered.att_avg)}</span>
                                </div>
                                <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                                    <div className="bg-cyan-400 h-full" style={{ width: `${hovered.occ_avg_pct}%` }}></div>
                                </div>
                                <div className="text-right text-xs text-cyan-400 mt-0.5">{hovered.occ_avg_pct}% Ocupación</div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 pt-2 border-t border-white/10">
                                <div className="flex justify-between">
                                    <span className="text-white/50">vs. Mun. ({hovered.municipality})</span>
                                    <span className="text-white font-mono">
                                        {hovered.pop_muni ? `${((hovered.att_avg / hovered.pop_muni) * 100).toFixed(2)}%` : "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/50">vs. Prov. ({hovered.province})</span>
                                    <span className="text-white font-mono">
                                        {hovered.pop_prov ? `${((hovered.att_avg / hovered.pop_prov) * 100).toFixed(2)}%` : "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/50">vs. CCAA ({hovered.ccaa})</span>
                                    <span className="text-white font-mono">
                                        {hovered.pop_ccaa ? `${((hovered.att_avg / hovered.pop_ccaa) * 100).toFixed(2)}%` : "N/A"}
                                    </span>
                                </div>
                            </div>

                            {(() => {
                                const teamName = hovered.team_primary || hovered.team || hovered.team_name || "";
                                const slug = teamName ? getTeamSlug(teamName) : "";

                                if (!slug) return null;

                                return (
                                    <div className="pt-3 border-t border-white/10">
                                        <a
                                            href={`/equipo/${slug}`}
                                            className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                                        >
                                            Ir a la página del equipo
                                        </a>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>

            {/* Panel de búsqueda - Más compacto y corto */}
            {shouldShowList && (
                <div className="w-56 h-[400px] bg-black/20 backdrop-blur-sm border border-white/5 rounded-xl p-3 overflow-hidden flex flex-col">
                    <div className="mb-3">
                        <div className="group relative flex items-center overflow-hidden rounded-full bg-white/5 p-1 shadow-sm ring-1 ring-white/5 backdrop-blur-sm transition-all focus-within:bg-white/10 focus-within:ring-white/20">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-neutral-400">
                                <Search className="h-3 w-3" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar..."
                                className="flex-1 bg-transparent px-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                        {filteredStadiums.length === 0 ? (
                            <div className="text-white/20 text-xs text-center py-4">
                                Sin resultados
                            </div>
                        ) : (
                            filteredStadiums.map((stadium) => (
                                <div
                                    key={stadium.stadium_name}
                                    className={`px-2 py-1 rounded-md cursor-pointer transition-all duration-200 ${highlightedStadium?.stadium_name === stadium.stadium_name
                                        ? "bg-cyan-400/15 border-l-2 border-cyan-400"
                                        : "bg-white/0 border-l-2 border-transparent hover:bg-white/5"
                                        }`}
                                    onMouseEnter={() => handleListHover(stadium)}
                                    onMouseLeave={() => setHoveredFromList(null)}
                                    onClick={() => {
                                        const teamName = stadium.team_primary || stadium.team || stadium.team_name || "";
                                        if (teamName) {
                                            const slug = getTeamSlug(teamName);
                                            window.location.href = `/equipo/${slug}`;
                                        }
                                    }}
                                >
                                    <div className="text-white/70 text-xs leading-snug">
                                        {stadium.stadium_name}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {shouldShowList && (
                <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.2);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.4);
        }
      `}</style>
            )}
        </div>
    );
};

export default MapComponent;

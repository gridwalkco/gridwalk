"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Menu } from "lucide-react";
import Sidebar from "../components/Sidebar/Sidebar";
import FileUploadModal from "../components/Modals/FileUploadModal";
import {
  getLocalStorageItem,
  safeSetItem,
  handleFileUpload as handleFileUploadUtil,
  handleFileDelete as handleFileDeleteUtil,
  handleFileToggle as handleFileToggleUtil,
} from "../utils/fileHandler";

const LoadingSpinner = () => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setRotation((prevRotation) => (prevRotation + 45) % 360);
    }, 100);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex justify-center items-center h-full w-full">
      <div
        className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full"
        style={{ transform: `rotate(${rotation}deg)` }}
      ></div>
    </div>
  );
};

const Map = dynamic(() => import("../components/Map/Map"), {
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <LoadingSpinner />
    </div>
  ),
  ssr: false,
});

const LAYER_NAMES = ["roads", "buildings"];

const Home: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeLayers, setActiveLayers] = useState<string[]>(() =>
    getLocalStorageItem("activeLayers", ["roads"]),
  );
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(() =>
    getLocalStorageItem("uploadedFiles", []),
  );
  const [activeFiles, setActiveFiles] = useState<string[]>(() =>
    getLocalStorageItem("activeFiles", []),
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUploadedFileName, setCurrentUploadedFileName] = useState("");
  const [currentUploadedFileContent, setCurrentUploadedFileContent] =
    useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    handleFileUploadUtil(
      file,
      setUploadError,
      setCurrentUploadedFileName,
      setCurrentUploadedFileContent,
      setIsModalOpen,
    );
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload],
  );

  const handleFileDelete = useCallback((fileName: string) => {
    handleFileDeleteUtil(fileName, setUploadedFiles, setActiveFiles);
  }, []);

  const handleFileToggle = useCallback(
    (fileName: string, isActive: boolean) => {
      handleFileToggleUtil(fileName, isActive, setActiveFiles);
    },
    [],
  );

  const handleLayerToggle = useCallback((updatedLayers: string[]) => {
    setActiveLayers(updatedLayers);
    safeSetItem("activeLayers", JSON.stringify(updatedLayers));
  }, []);

  const handleLayerNameConfirm = useCallback(
    async (layerName: string, isRemote: boolean) => {
      console.log(
        `handleLayerNameConfirm called with: ${layerName}, isRemote: ${isRemote}`,
      );
      try {
        const jsonData = JSON.parse(currentUploadedFileContent);
        if (isRemote) {
          console.log("Initiating remote upload...");
          const response = await fetch("/api/remote-file-s3-upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              layerName: layerName,
              data: jsonData,
            }),
          });
          console.log("Response status:", response.status);
          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              "Upload failed:",
              response.status,
              response.statusText,
              errorText,
            );
            throw new Error(
              `Remote upload failed: ${response.status} ${response.statusText}`,
            );
          }
          const result = await response.json();
          console.log("Remote upload successful:");
          safeSetItem(`file:${layerName}`, result.url);
        } else {
          console.log("Performing local upload...");
          safeSetItem(`file:${layerName}`, JSON.stringify(jsonData));
        }
        setUploadedFiles((prev) => {
          const updatedFiles = [...prev, layerName];
          safeSetItem("uploadedFiles", JSON.stringify(updatedFiles));
          return updatedFiles;
        });
      } catch (error) {
        console.error("Error handling file upload:", error);
        setUploadError("Error saving file. Please try again.");
      }
      console.log("Closing modal and resetting state...");
      setIsModalOpen(false);
      setCurrentUploadedFileName("");
      setCurrentUploadedFileContent("");
    },
    [currentUploadedFileContent],
  );

  return (
    <div
      className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Sidebar
        isOpen={sidebarOpen}
        onClose={useCallback(() => setSidebarOpen(false), [])}
        onLayerToggle={handleLayerToggle}
        onFileUpload={handleFileUpload}
        onFileDelete={handleFileDelete}
        onFileToggle={handleFileToggle}
        activeLayers={activeLayers}
        layerNames={LAYER_NAMES}
        uploadedFiles={uploadedFiles}
        activeFiles={activeFiles}
        uploadError={uploadError}
      />
      <main className="flex-1 relative">
        <button
          className="absolute top-4 left-4 z-10 md:hidden text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded-md shadow-md"
          onClick={useCallback(() => setSidebarOpen(true), [])}
        >
          <Menu className="w-6 h-6" />
        </button>
        <Map activeFiles={activeFiles} />
      </main>
      <FileUploadModal
        isOpen={isModalOpen}
        onClose={useCallback(() => setIsModalOpen(false), [])}
        onConfirm={handleLayerNameConfirm}
        defaultLayerName={currentUploadedFileName || ""}
      />
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <p className="text-xl font-bold">Drop GeoJSON file here</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

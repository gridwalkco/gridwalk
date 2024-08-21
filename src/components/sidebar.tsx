"use client"
import React, { useEffect, useCallback } from 'react';
import { X, Layers, Upload } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLayerToggle: (layers: string[]) => void;
  activeLayers: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onLayerToggle, activeLayers }) => {
  const layerNames = ['roads', 'buildings'];
  const isLayerActive = useCallback((layer: string) => activeLayers.includes(layer), [activeLayers]);

  const handleCheckboxChange = (layerName: string) => {
    const updatedLayers = isLayerActive(layerName)
      ? activeLayers.filter(layer => layer !== layerName)
      : [...activeLayers, layerName];
    onLayerToggle(updatedLayers);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File uploaded:', file.name);
      // Add your file handling logic here
    }
  };

  const SidebarContent: React.FC = () => (
    <>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">GridWalk</h1>
      </div>
      <div className="flex-1 px-6 py-4">
        <h2 className="flex items-center text-lg font-semibold mb-6 text-gray-700 dark:text-gray-200">
          <Layers className="mr-2 h-5 w-5" />
          Layer Options
        </h2>
        {layerNames.map((layerName) => (
          <div key={layerName} className="mb-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isLayerActive(layerName)}
                onChange={() => handleCheckboxChange(layerName)}
                className="form-checkbox h-5 w-5 text-blue-600 rounded transition duration-150 ease-in-out"
              />
              <span className="text-gray-700 dark:text-gray-300 capitalize">{layerName}</span>
            </label>
          </div>
        ))}
        <div className="mt-8">
          <h2 className="flex items-center text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
            <Upload className="mr-2 h-5 w-5" />
            Upload File
          </h2>
          <label className="flex flex-col items-center px-4 py-6 bg-white dark:bg-gray-700 text-blue-600 rounded-lg shadow-lg tracking-wide uppercase border border-blue-600 cursor-pointer hover:bg-blue-600 hover:text-white transition duration-300 ease-in-out">
            <svg className="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
            </svg>
            <span className="mt-2 text-sm leading-normal">Select a file</span>
            <input type='file' className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Sidebar for larger screens */}
      <aside className="hidden md:flex flex-col w-80 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-lg">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300 ease-in-out" onClick={onClose}></div>
          <nav className="relative flex flex-col w-80 h-full bg-gray-50 dark:bg-gray-900 transform transition-all duration-300 ease-in-out">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={onClose}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <SidebarContent />
          </nav>
        </div>
      )}
    </>
  );
};

export default Sidebar;

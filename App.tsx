/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import Spinner from './components/Spinner';
import ProductSelector from './components/ProductSelector';
import ImageGenerator from './components/ImageGenerator';
import { analyzeFit, generateObjectImage } from './services/geminiService';
import { AnalysisResult, AnalysisVerdict } from './types';
import { presetOptions } from './data/products';

const App: React.FC = () => {
  // objectSource can be a File object (upload) or a base64 string (preset/generated)
  const [objectSource, setObjectSource] = useState<File | string | null>(null);
  const [spaceFile, setSpaceFile] = useState<File | null>(null);

  const [objectImageUrl, setObjectImageUrl] = useState<string | null>(null);
  const [spaceImageUrl, setSpaceImageUrl] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Effect to handle object image preview URL creation/cleanup
  useEffect(() => {
    let url: string | null = null;

    if (objectSource instanceof File) {
      url = URL.createObjectURL(objectSource);
      setObjectImageUrl(url);
    } else if (typeof objectSource === 'string') {
      setObjectImageUrl(objectSource);
    } else {
      setObjectImageUrl(null);
    }

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [objectSource]);

  // Effect to handle space image preview URL creation/cleanup
  useEffect(() => {
    if (spaceFile) {
      const url = URL.createObjectURL(spaceFile);
      setSpaceImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setSpaceImageUrl(null);
    }
  }, [spaceFile]);

  const handleObjectFileSelect = useCallback((file: File) => {
    setObjectSource(file);
    setResult(null);
    setError(null);
  }, []);

  const handleSpaceFileSelect = useCallback((file: File) => {
    setSpaceFile(file);
    setResult(null);
    setError(null);
  }, []);

  const handleGenerateObject = async (prompt: string) => {
    setIsGenerating(true);
    setError(null);
    setResult(null);
    setObjectSource(null);

    try {
        const base64Data = await generateObjectImage(prompt);
        const dataUrl = `data:image/jpeg;base64,${base64Data}`;
        setObjectSource(dataUrl);
    } catch (e) {
        if (e instanceof Error) {
            setError(`Failed to generate object: ${e.message}`);
        } else {
            setError('Failed to generate object.');
        }
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!objectSource || !spaceFile) {
      setError('Please provide both an object and a space image.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // service now accepts File | string for inputs
      const analysisResult = await analyzeFit(objectSource, spaceFile);
      setResult(analysisResult);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReset = () => {
    setObjectSource(null);
    setSpaceFile(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
    setIsGenerating(false);
  };

  const isButtonDisabled = !objectSource || !spaceFile || isLoading || isGenerating;

  const getResultColorClasses = (verdict: AnalysisVerdict) => {
    switch (verdict) {
      case 'Yes':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'Tight':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'No':
        return 'bg-red-100 border-red-500 text-red-800';
      default:
        return 'bg-zinc-100 border-zinc-500 text-zinc-800';
    }
  };

  const getButtonText = () => {
    if (isGenerating) return 'Generating Object...';
    if (isLoading) return 'Analyzing...';
    return 'Will It Fit?';
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center p-4 md:p-8 font-sans">
      <Header />
      <main className="w-full max-w-4xl mx-auto mt-8">
        {!result && !isLoading && (
            <div className="flex flex-col gap-y-12 animate-fade-in">
                {/* Step 1: The Object */}
                <section aria-labelledby="object-heading">
                    <div className="flex flex-col items-center bg-white p-6 rounded-xl shadow-sm border border-zinc-100">
                        <ImageUploader
                            id="object-image"
                            label="1. The Object"
                            onFileSelect={handleObjectFileSelect}
                            imageUrl={objectImageUrl}
                        />
                        
                        <div className="flex items-center justify-center my-8 w-full max-w-lg">
                            <hr className="w-full border-zinc-200" />
                            <span className="px-4 text-zinc-400 font-medium text-sm whitespace-nowrap">OR GENERATE WITH AI</span>
                            <hr className="w-full border-zinc-200" />
                        </div>
                        
                        <div className="w-full max-w-xl">
                            <ImageGenerator onGenerate={handleGenerateObject} isGenerating={isGenerating} />
                            <ProductSelector
                                products={presetOptions}
                                onSelect={handleGenerateObject}
                                disabled={isGenerating}
                            />
                        </div>
                    </div>
                </section>
                
                {/* Step 2: The Space */}
                <section aria-labelledby="space-heading">
                    <div className="flex flex-col items-center bg-white p-6 rounded-xl shadow-sm border border-zinc-100">
                        <ImageUploader
                            id="space-image"
                            label="2. The Space"
                            onFileSelect={handleSpaceFileSelect}
                            imageUrl={spaceImageUrl}
                        />
                    </div>
                </section>
            </div>
        )}
        
        <div className="mt-12 text-center">
        {!result && !isLoading && (
            <button
                onClick={handleSubmit}
                disabled={isButtonDisabled}
                className="px-10 py-5 bg-blue-600 text-white font-bold text-xl rounded-full shadow-lg hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
            >
                {getButtonText()}
            </button>
        )}
        </div>

        {isLoading && (
          <div className="mt-12 text-center animate-fade-in">
            <div className="text-blue-600">
              <Spinner />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-zinc-800">Analyzing Dimensions...</h3>
            <p className="mt-2 text-zinc-500">Our AI is comparing the object and the space.</p>
          </div>
        )}

        {error && (
            <div className="mt-8 max-w-3xl mx-auto p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center shadow-sm animate-fade-in" role="alert">
                <p className="font-bold mb-1">Something went wrong</p>
                <p>{error}</p>
                <button onClick={handleReset} className="mt-3 px-4 py-2 bg-white border border-red-200 rounded-full text-sm font-semibold hover:bg-red-50 transition-colors">Try Again</button>
            </div>
        )}

        {result && !isLoading && (
          <div className="mt-8 max-w-3xl mx-auto animate-fade-in">
            <div className={`border-l-4 p-8 rounded-lg shadow-lg bg-white ${getResultColorClasses(result.verdict)}`}>
              <h3 className="text-4xl font-black mb-4 tracking-tight">Verdict: {result.verdict}</h3>
              <p className="text-lg leading-relaxed text-zinc-700">{result.explanation}</p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100">
                    <h4 className="font-bold text-center mb-4 text-zinc-500 uppercase text-sm tracking-wider">Object</h4>
                    <div className="aspect-square bg-zinc-50 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src={objectImageUrl!} alt="Object" className="max-w-full max-h-full object-contain" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100">
                    <h4 className="font-bold text-center mb-4 text-zinc-500 uppercase text-sm tracking-wider">Space</h4>
                     <div className="aspect-square bg-zinc-50 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src={spaceImageUrl!} alt="Space" className="max-w-full max-h-full object-contain" />
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center">
                <button
                    onClick={handleReset}
                    className="px-8 py-3 bg-white border border-zinc-300 text-zinc-700 font-bold rounded-full hover:bg-zinc-50 hover:border-zinc-400 transition-all shadow-sm"
                >
                    Start Over
                </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

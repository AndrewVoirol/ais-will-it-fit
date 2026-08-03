/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import Spinner from './Spinner';

interface ImageGeneratorProps {
    onGenerate: (prompt: string) => Promise<void>;
    isGenerating: boolean;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onGenerate, isGenerating }) => {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            onGenerate(prompt);
        }
    };

    return (
        <div className="flex flex-col items-center w-full">
            <form onSubmit={handleSubmit} className="w-full max-w-lg flex gap-2">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    name="object-prompt"
                    placeholder="e.g., a comfy red armchair"
                    className="flex-grow p-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-zinc-900 placeholder-zinc-500"
                    disabled={isGenerating}
                    aria-label="Object generation prompt"
                />
                <button
                    type="submit"
                    disabled={!prompt.trim() || isGenerating}
                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed transition-all flex items-center justify-center w-32"
                >
                    {isGenerating ? <Spinner small /> : 'Generate'}
                </button>
            </form>
        </div>
    );
};

export default ImageGenerator;
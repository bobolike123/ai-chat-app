import React, { useState } from 'react';

interface VideoParamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: VideoGenerationParams) => void;
}

interface VideoGenerationParams {
  prompt: string;
  resolution: string;
  duration: number;
  aspectRatio: string;
  fps: number;
  seed?: number;
}

const VideoParamsModal: React.FC<VideoParamsModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [params, setParams] = useState<VideoGenerationParams>({
    prompt: '',
    resolution: '720p',
    duration: 5,
    aspectRatio: '16:9',
    fps: 24,
    seed: undefined
  });

  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    onGenerate(params);
    setIsGenerating(false);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setParams(prev => ({
      ...prev,
      [name]: name === 'seed' && value === '' ? undefined : 
              name === 'seed' || name === 'duration' || name === 'fps' ? Number(value) : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">视频生成参数</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              分辨率
            </label>
            <select
              name="resolution"
              value={params.resolution}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              视频时长 (秒)
            </label>
            <input
              type="range"
              name="duration"
              min="3"
              max="12"
              value={params.duration}
              onChange={handleChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>3秒</span>
              <span className="font-medium">{params.duration}秒</span>
              <span>12秒</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              视频比例
            </label>
            <select
              name="aspectRatio"
              value={params.aspectRatio}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="16:9">16:9 (宽屏)</option>
              <option value="4:3">4:3 (传统屏幕)</option>
              <option value="1:1">1:1 (正方形)</option>
              <option value="3:4">3:4 (竖屏传统)</option>
              <option value="9:16">9:16 (竖屏)</option>
              <option value="21:9">21:9 (超宽屏)</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              帧率 (FPS)
            </label>
            <select
              name="fps"
              value={params.fps}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled
            >
              <option value={24}>24 FPS</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              随机种子 (可选)
            </label>
            <input
              type="number"
              name="seed"
              value={params.seed || ''}
              onChange={handleChange}
              placeholder="留空以使用随机种子"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg transition-colors duration-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              {isGenerating ? '生成中...' : '生成视频'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VideoParamsModal;

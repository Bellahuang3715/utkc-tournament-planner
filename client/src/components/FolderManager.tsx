import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { File, Folder } from '../types';

type FileSystemItem = File | Folder;

interface FileProps {
  item: FileSystemItem;
  onAddItem: (parentId: string, type: 'file' | 'folder') => void;
}

const Files: React.FC = () => {
  const [items, setItems] = useState<Array<FileSystemItem>>([
    {
      id: uuidv4(),
      name: 'Root',
      type: 'folder',
      children: [],
    } as Folder,
  ]);

  const addItem = (parentId: string, type: 'file' | 'folder') => {
    setItems((prevItems) => {
      const newItems = [...prevItems];
      const newItem: FileSystemItem =
        type === 'file'
          ? { id: uuidv4(), name: 'New File', type: 'file' }
          : { id: uuidv4(), name: 'New Folder', type: 'folder', children: [] };

      const addToFolder = (items: Array<FileSystemItem>, folderId: string) => {
        items.forEach((item) => {
          if (item.type === 'folder' && item.id === folderId) {
            (item as Folder).children.push(newItem);
          } else if (item.type === 'folder') {
            addToFolder((item as Folder).children, folderId);
          }
        });
      };

      addToFolder(newItems, parentId);
      return newItems;
    });
  };

  return (
    <div>
      <h2>File System</h2>
      {items.map((item) => (
        <FileOrFolder key={item.id} item={item} onAddItem={addItem} />
      ))}
    </div>
  );
};

const FileOrFolder: React.FC<FileProps> = ({ item, onAddItem }) => {
  const [expanded, setExpanded] = useState(false);

  if (item.type === 'file') {
    return <div>📄 {item.name}</div>;
  }

  return (
    <div style={{ paddingLeft: 20 }}>
      <div>
        <span onClick={() => setExpanded(!expanded)}>
          {expanded ? '📂' : '📁'} {item.name}
        </span>
        <button onClick={() => onAddItem(item.id, 'file')}>+ File</button>
        <button onClick={() => onAddItem(item.id, 'folder')}>+ Folder</button>
      </div>
      {expanded && item.children.map((child) => (
        <FileOrFolder key={child.id} item={child} onAddItem={onAddItem} />
      ))}
    </div>
  );
};

export default Files;

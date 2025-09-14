import React, { useState } from "react";
import {
  Modal,
  Button,
  TextInput,
  ColorInput,
  Group,
  Stack,
  ActionIcon,
  Title,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";

export interface Category {
  id: string; // unique key
  name: string;
  color: string;
}

interface CategoryConfigModalProps {
  tournament_id: number;
  opened: boolean;
  onClose: () => void;
  onSave: (updated: Category[]) => void;
}

export default function CategoryConfigModal({
  tournament_id,
  opened,
  onClose,
  onSave,
}: CategoryConfigModalProps) {

  const initialCategories: Category[] = [
    { id: "1", name: "General", color: "#228be6" },
    { id: "2", name: "Urgent", color: "#ff6b6b" },
    { id: "3", name: "Low Priority", color: "#51cf66" },
    { id: "4", name: "Work", color: "#fcc419" },
    { id: "5", name: "Personal", color: "#a9a9a9" },
  ];
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  const updateCat = (id: string, changes: Partial<Category>) => {
    setCategories((cats) =>
      cats.map((c) => (c.id === id ? { ...c, ...changes } : c))
    );
  };

  const addCategory = () => {
    setCategories((cats) => [
      ...cats,
      { id: crypto.randomUUID(), name: "", color: "#228be6" },
    ]);
  };

  const removeCategory = (id: string) => {
    setCategories((cats) => cats.filter((c) => c.id !== id));
  };

  const handleSave = () => {
    onSave(categories);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={<Title order={4}>Manage Categories</Title>}
    >
      <Stack gap="md">
        {categories.map((cat) => (
          <Group key={cat.id} gap="sm">
            <ColorInput
              value={cat.color}
              onChange={(c) => updateCat(cat.id, { color: c })}
              size="xs"
            />
            <TextInput
              placeholder="Category name"
              value={cat.name}
              onChange={(e) =>
                updateCat(cat.id, { name: e.currentTarget.value })
              }
              style={{ flex: 1 }}
              size="xs"
            />
            <ActionIcon color="red" onClick={() => removeCategory(cat.id)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Button
          leftSection={<IconPlus size={16} />}
          variant="outline"
          onClick={addCategory}
        >
          Add category
        </Button>
      </Stack>

      <Group align="right" mt="lg">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button color="green" onClick={handleSave}>
          Save changes
        </Button>
      </Group>
    </Modal>
  );
}

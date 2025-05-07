import React, { useState } from "react";
import {
  Modal,
  Button,
  FileButton,
  TextInput,
  Group,
  Text,
  ActionIcon,
  Box,
  NumberInput,
  useMantineTheme,
} from "@mantine/core";
import { IconX, IconUpload } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";

export type FieldDefinition = {
  key: string;
  label: string;
  include: boolean;
  options: string[];
};

export interface ClubUpload {
  file: File;
  clubName: string;
  clubAbbr: string;
  numberOfTeams: number;
}

interface ClubImportModalProps {
  opened: boolean;
  onClose: () => void;
  onImportAll: (uploads: ClubUpload[]) => void;
}

export default function ClubImportModal({ opened, onClose, onImportAll }: ClubImportModalProps) {
  const theme = useMantineTheme();
  const { t } = useTranslation();

  const [clubName, setClubName] = useState("");
  const [clubAbbr, setClubAbbr] = useState("");
  const [clubFile, setClubFile] = useState<File | null>(null);
  const [numberOfTeams, setNumberOfTeams] = useState<number | undefined>(undefined);
  const [uploads, setUploads] = useState<ClubUpload[]>([]);

  const canAdd =
    !!clubFile &&
    clubName.trim() !== "" &&
    clubAbbr.trim() !== "" &&
    typeof numberOfTeams === "number" &&
    numberOfTeams > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    setUploads((u) => [
      ...u,
      {
        file: clubFile!,
        clubName: clubName.trim(),
        clubAbbr: clubAbbr.trim(),
        numberOfTeams: numberOfTeams!,
      },
    ]);
    setClubFile(null);
    setClubName("");
    setClubAbbr("");
    setNumberOfTeams(undefined);
  };

  return (
    <Modal opened={opened} onClose={onClose} size="lg" title={t("import_clubs", "Import Club Sheets")}
    >
      <Group align="center" gap="sm" mb="md">
        {clubFile ? (
          <>
            <IconUpload size={20} />
            <Text>{clubFile.name}</Text>
            <ActionIcon onClick={() => setClubFile(null)}>
              <IconX size={16} />
            </ActionIcon>
          </>
        ) : (
          <FileButton onChange={setClubFile} accept=".xlsx">
            {(props) => <Button {...props}>{t("upload_club_file", "Upload Club Sheet")}</Button>}
          </FileButton>
        )}
      </Group>

      <TextInput
        label={t("club_name", "Club Name")}
        value={clubName}
        onChange={(e) => setClubName(e.currentTarget.value)}
        required
        mb="sm"
      />
      <TextInput
        label={t("club_abbr", "Club Abbreviation")}
        value={clubAbbr}
        onChange={(e) => setClubAbbr(e.currentTarget.value)}
        required
        mb="sm"
      />
      <NumberInput
        label={t("number_of_teams", "Number of Teams")}
        min={0}
        required
        value={numberOfTeams}
        onChange={(val) => {
          if (typeof val === "number") setNumberOfTeams(val);
        }}
        mb="sm"
      />
      <Button disabled={!canAdd} onClick={handleAdd} mb="md">
        {t("add_club", "Add to List")}
      </Button>

      <Box>
        {uploads.map((u, i) => (
          <Group key={i} justify="space-between" mb="xs">
            <Text>{u.clubName} ({u.clubAbbr}) — {u.file.name}</Text>
            <ActionIcon onClick={() => setUploads((us) => us.filter((_, j) => j !== i))}>
              <IconX size={16} />
            </ActionIcon>
          </Group>
        ))}
      </Box>

      <Button
        mt="md"
        fullWidth
        disabled={uploads.length === 0}
        onClick={() => onImportAll(uploads)}
      >
        {t("import_all", "Import All Clubs")}
      </Button>
    </Modal>
  );
}

import { Group, PasswordInput, Progress, Stack, Text } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next/pages';
import { useState } from 'react';

const PASSWORD_RULES = [
  { re: /[0-9]/, labelKey: 'number_required' },
  { re: /[a-z]/, labelKey: 'lowercase_required' },
  { re: /[A-Z]/, labelKey: 'uppercase_required' },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, labelKey: 'special_character_required' },
] as const;

export function passwordMeetsRequirements(password: string) {
  return password.length >= 8 && PASSWORD_RULES.every((rule) => rule.re.test(password));
}

function PasswordRequirement({ meets, label }: { meets: boolean; label: string }) {
  return (
    <Text c={meets ? 'teal' : 'red'} pt="0rem" size="sm">
      {meets ? <IconCheck size={12} stroke={1.5} /> : <IconX size={12} stroke={1.5} />} {label}
    </Text>
  );
}

export function PasswordStrength({ form, size }: { form: any; size?: string }) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const password = form.values.password ?? '';
  const showRequirements = focused || password.length > 0;

  const requirements = PASSWORD_RULES.map((rule) => ({
    re: rule.re,
    label: t(rule.labelKey),
  }));

  function getStrength(password: string) {
    let multiplier = password.length > 5 ? 0 : 1;

    requirements.forEach((requirement) => {
      if (!requirement.re.test(password)) {
        multiplier += 1;
      }
    });

    return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 0);
  }

  const strength = getStrength(password);
  const checks = requirements.map((requirement, index) => (
    <PasswordRequirement
      key={index}
      label={requirement.label}
      meets={requirement.re.test(password)}
    />
  ));
  const bars = Array(4)
    .fill(0)
    .map((_, index) => (
      <Progress
        value={
          password.length > 0 && index === 0 ? 100 : strength >= ((index + 1) / 4) * 100 ? 100 : 0
        }
        c={strength > 80 ? 'teal' : strength > 50 ? 'yellow' : 'red'}
        key={index}
        size={4}
      />
    ));

  const inputProps = form.getInputProps('password');

  return (
    <div style={size ? undefined : { marginBottom: '1.0rem' }}>
      <PasswordInput
        size={size}
        placeholder={t('password_input_placeholder')}
        label={t('password_input_label')}
        mt={size ? undefined : '1.0rem'}
        required
        {...inputProps}
        onFocus={(event) => {
          setFocused(true);
          inputProps.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          inputProps.onBlur?.(event);
        }}
      />

      {showRequirements && (
        <>
          <Group gap={5} grow mt="xs" mb="md">
            {bars}
          </Group>

          <Stack gap="xs">
            <PasswordRequirement
              label={t('8_characters_required')}
              meets={password.length >= 8}
            />
            {checks}
          </Stack>
        </>
      )}
    </div>
  );
}

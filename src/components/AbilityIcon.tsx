import { memo } from 'react';
import { AbilityId } from '../game/abilityConfig';

interface AbilityIconProps {
  id: AbilityId;
  size?: number;
  variant?: 'blue' | 'green';
}

/**
 * Shared Cartoon SVG icon set for character abilities,
 * used identically in both gameplay AbilityBar and CharacterSelector.
 */
export const AbilityIcon = memo(function AbilityIcon({
  id,
  size = 22,
  variant = 'blue',
}: AbilityIconProps) {
  const qsPrimary = variant === 'green' ? '#4DFF9E' : '#38BDF8';
  const qsLight = variant === 'green' ? '#B6FFD8' : '#BAE6FD';
  switch (id) {
    case 'flight':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 3.5L16.8 8.8H13.8V13.8H10.2V8.8H7.2L12 3.5Z"
            fill="#FFFFFF"
            stroke="#0B0D18"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M4.5 16.5C6.8 15 9.2 17.8 12 16.4C14.8 15 17.2 17.8 19.5 16.3"
            stroke="#FF7B93"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <path
            d="M6.5 19.8C8.8 18.6 11.2 20.6 14 19.4C15.8 18.6 17.2 19.2 18.2 19.6"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'chaos-bolt':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="6.2"
            fill="#FF4B64"
            stroke="#0B0D18"
            strokeWidth="1.7"
          />
          <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
          <path
            d="M12 2.2V5.3M12 18.7V21.8M2.2 12H5.3M18.7 12H21.8M5.1 5.1L7.3 7.3M16.7 16.7L18.9 18.9M18.9 5.1L16.7 7.3M7.3 16.7L5.1 18.9"
            stroke="#FFFFFF"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'darkhold':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Open Darkhold grimoire pages with dark-crimson filigree cover & Chaos Star sigil */}
          <path
            d="M3 6.2C3 5.3 3.7 4.7 4.6 4.8L11.4 6.2V19.6L4.2 18.2C3.5 18 3 17.4 3 16.7V6.2Z"
            fill="#5C1324"
            stroke="#0B0D18"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M21 6.2C21 5.3 20.3 4.7 19.4 4.8L12.6 6.2V19.6L19.8 18.2C20.5 18 21 17.4 21 16.7V6.2Z"
            fill="#5C1324"
            stroke="#0B0D18"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M4.6 6.6L10.8 7.8V17.8L4.6 16.6V6.6Z"
            fill="#F4E3C9"
            stroke="#0B0D18"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path
            d="M19.4 6.6L13.2 7.8V17.8L19.4 16.6V6.6Z"
            fill="#EAD2B0"
            stroke="#0B0D18"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          {/* Glowing Scarlet Chaos Rune Sigil over Darkhold */}
          <circle cx="12" cy="12" r="3.4" fill="#FF3258" stroke="#0B0D18" strokeWidth="1.2" />
          <path
            d="M12 7.3L13.1 10.6L16.5 10.6L13.8 12.6L14.8 15.9L12 13.9L9.2 15.9L10.2 12.6L7.5 10.6L10.9 10.6Z"
            fill="#FFE6EC"
          />
        </svg>
      );

    case 'teleport':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="8.2"
            stroke="#FF637D"
            strokeWidth="2.1"
            strokeDasharray="4 2.5"
          />
          <path
            d="M7.5 14.5L13.5 8.5M13.5 8.5H9.2M13.5 8.5V12.8"
            stroke="#FFFFFF"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16.8" cy="16.4" r="2.2" fill="#FFFFFF" stroke="#0B0D18" strokeWidth="1.3" />
        </svg>
      );

    case 'telekinetic-explosion':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Outward scarlet telekinetic shockwave ring & directional burst rays */}
          <circle
            cx="12"
            cy="12"
            r="7.8"
            stroke="#FF4B6E"
            strokeWidth="2.1"
            strokeDasharray="4.5 2.4"
          />
          <circle
            cx="12"
            cy="12"
            r="3.8"
            fill="#FF2E54"
            stroke="#FFFFFF"
            strokeWidth="1.7"
          />
          <path
            d="M12 2.4V5.2M12 18.8V21.6M2.4 12H5.2M18.8 12H21.6M5 5L7.1 7.1M16.9 16.9L19 19M19 5L16.9 7.1M7.1 16.9L5 19"
            stroke="#FFFFFF"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'auto-shield':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Crimson Hex Protection Shield */}
          <path
            d="M12 2.8L19.4 5.8V11.6C19.4 16.3 16.2 19.9 12 21.4C7.8 19.9 4.6 16.3 4.6 11.6V5.8L12 2.8Z"
            fill="#E01F47"
            stroke="#0B0D18"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M12 5.4L16.8 7.4V11.4C16.8 14.7 14.7 17.3 12 18.5C9.3 17.3 7.2 14.7 7.2 11.4V7.4L12 5.4Z"
            fill="#FF6B88"
            stroke="#FFFFFF"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="11.6" r="2.2" fill="#FFFFFF" />
        </svg>
      );

    case 'chaos-implosion':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="4.2"
            fill="#D91E36"
            stroke="#FFFFFF"
            strokeWidth="1.8"
          />
          <path
            d="M3.5 3.5L8.2 8.2M8.2 8.2H5.3M8.2 8.2V5.3"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20.5 3.5L15.8 8.2M15.8 8.2H18.7M15.8 8.2V5.3"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3.5 20.5L8.2 15.8M8.2 15.8H5.3M8.2 15.8V18.7"
            stroke="#FF8FA3"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20.5 20.5L15.8 15.8M15.8 15.8H18.7M15.8 15.8V18.7"
            stroke="#FF8FA3"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'phoenix-wave':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Triple erupting flame wave plumes */}
          <path
            d="M4.2 18.5C4.2 15 6 12.6 7.4 11.2C7.6 13.1 8.8 14.3 9.2 14.8C9.8 11.2 11.6 6.2 12.2 3.5C14.1 6.7 15.5 10.2 15.3 14.1C16.2 13.1 17 11.8 17.1 10.6C18.8 12.6 19.8 15.3 19.8 18.5H4.2Z"
            fill="#FFA726"
            stroke="#0B0D18"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 18.5C8.5 15.9 10.2 13.4 12 10.6C13.8 13.4 15.5 15.9 15.5 18.5H8.5Z"
            fill="#FFF3A8"
          />
          <path
            d="M3 20.4H21"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'phoenix-fireballs':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Blazing comet fireball with fiery tail */}
          <path
            d="M4.5 6.5L10.8 10.2M3.2 12.4H9.4M5.4 18L10.8 14.2"
            stroke="#FFD54F"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <circle
            cx="14.8"
            cy="12"
            r="5.6"
            fill="#FF6D1A"
            stroke="#0B0D18"
            strokeWidth="1.7"
          />
          <circle cx="15.2" cy="11.6" r="2.8" fill="#FFF6B3" />
        </svg>
      );

    case 'pain-infliction':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Psychic fire constriction reticle & burst */}
          <circle
            cx="12"
            cy="12"
            r="7.6"
            stroke="#FF981A"
            strokeWidth="2.1"
            strokeDasharray="4 2.5"
          />
          <path
            d="M12 4.4V8.2M12 15.8V19.6M4.4 12H8.2M15.8 12H19.6"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 8.2C13.6 10 14.4 11.4 14.4 12.8C14.4 14.2 13.3 15.2 12 15.2C10.7 15.2 9.6 14.2 9.6 12.8C9.6 11.4 10.4 10 12 8.2Z"
            fill="#FF5722"
            stroke="#FFFFFF"
            strokeWidth="1.4"
          />
        </svg>
      );

    case 'phoenix-flight':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Spread Phoenix fiery wings */}
          <path
            d="M12 14.5C9.4 14.5 5.2 11.4 3.2 6.8C6.6 7.5 9.2 9.1 11.2 11.2L12 6.2L12.8 11.2C14.8 9.1 17.4 7.5 20.8 6.8C18.8 11.4 14.6 14.5 12 14.5Z"
            fill="#FFAB2E"
            stroke="#0B0D18"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M6.4 15.2C8.5 16.5 10.4 16.9 12 19.6C13.6 16.9 15.5 16.5 17.6 15.2"
            stroke="#FFFFFF"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'mind-control':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Psychic mind-control link between Emma and target */}
          <circle cx="6.2" cy="12" r="3.1" fill="#E8F6FF" stroke="#0B0D18" strokeWidth="1.5" />
          <circle cx="17.8" cy="12" r="3.1" fill="#80DCFF" stroke="#0B0D18" strokeWidth="1.5" />
          <path
            d="M9.4 12H14.6"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M12 6.2C14.2 6.2 16 7.4 16.8 9M12 17.8C14.2 17.8 16 16.6 16.8 15"
            stroke="#80DCFF"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'astral-projection':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Glowing psychic astral silhouette with outer ethereal aura */}
          <circle
            cx="12"
            cy="12"
            r="8.8"
            stroke="#8AE8FF"
            strokeWidth="1.5"
            strokeDasharray="3.2 2.4"
          />
          <circle
            cx="12"
            cy="7.4"
            r="2.7"
            fill="#C7F4FF"
            stroke="#0B0D18"
            strokeWidth="1.4"
          />
          <path
            d="M7.6 18.6V13.8C7.6 12.2 8.8 11 10.4 11H13.6C15.2 11 16.4 12.2 16.4 13.8V18.6"
            fill="#94E7FF"
            stroke="#0B0D18"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M4.8 10.2C5.8 7.5 8.5 5.4 12 5.4C15.5 5.4 18.2 7.5 19.2 10.2"
            stroke="#E8FBFF"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'mc-paralysis':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Immobilized silhouette with glowing white psychic lock rings */}
          <circle cx="12" cy="7.4" r="2.9" fill="#FFFFFF" stroke="#0B0D18" strokeWidth="1.5" />
          <path
            d="M7.6 18.6V13.6C7.6 12.1 8.8 11 10.3 11H13.7C15.2 11 16.4 12.1 16.4 13.6V18.6"
            fill="#CFEFFF"
            stroke="#0B0D18"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <ellipse cx="12" cy="14.5" rx="7.2" ry="2.2" stroke="#FFFFFF" strokeWidth="1.9" />
        </svg>
      );

    case 'mc-sleep':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Psychic crescent moon & sleep waves */}
          <path
            d="M14.8 4.4C10.9 5 8.1 8.4 8.4 12.4C8.7 16.4 12 19.4 16 19.4C17.4 19.4 18.7 19 19.8 18.2C16.2 18.5 13.1 15.8 12.9 12.1C12.7 9 14.3 6.2 16.9 4.8C16.2 4.5 15.5 4.4 14.8 4.4Z"
            fill="#BCEEFF"
            stroke="#0B0D18"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M15.4 6.5H19.4L15.6 10.3H19.6"
            stroke="#FFFFFF"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'mc-mental-damage':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Focused psychic beam strike burst */}
          <path
            d="M13.6 3L6.8 12.4H11.6L10.2 21L17.4 11.4H12.4L13.6 3Z"
            fill="#80DCFF"
            stroke="#0B0D18"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="8.2" stroke="#E8F6FF" strokeWidth="1.5" strokeDasharray="3.8 2.4" />
        </svg>
      );

    case 'mental-attack':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Telepathic forehead wind bolt + comic starburst */}
          <path
            d="M12 2.8L14 8.2L19.6 6.8L15.8 11.4L21 13.8L15.4 15.2L17 20.6L12.4 16.8L8.2 20.8L9.2 15.4L3.4 14L8.6 11.2L5.2 6.6L10.4 8.2Z"
            fill="#E8F6FF"
            stroke="#0B0D18"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.6" fill="#7CD8FF" />
        </svg>
      );

    case 'diamond-form':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Faceted living diamond crystal */}
          <path
            d="M6.5 4.2H17.5L21.2 9.4L12 20.4L2.8 9.4L6.5 4.2Z"
            fill="#C7F0FF"
            stroke="#0B0D18"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M2.8 9.4H21.2M6.5 4.2L9.2 9.4L12 20.4L14.8 9.4L17.5 4.2"
            stroke="#FFFFFF"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'telepathic-wave':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Expanding concentric psychic rings */}
          <circle cx="12" cy="12" r="2.6" fill="#FFFFFF" stroke="#0B0D18" strokeWidth="1.4" />
          <circle cx="12" cy="12" r="5.6" stroke="#9EE4FF" strokeWidth="2" />
          <circle
            cx="12"
            cy="12"
            r="8.8"
            stroke="#E8F6FF"
            strokeWidth="1.8"
            strokeDasharray="4.5 2.2"
          />
        </svg>
      );

    case 'diamond-projectile':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Razor diamond crystal shard projectile */}
          <path
            d="M20.5 4.2L15.2 15.8L9.6 14.4L8.2 8.8L20.5 4.2Z"
            fill="#D8F5FF"
            stroke="#0B0D18"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M20.5 4.2L12.4 11.6M4 19.6L8.8 14.8M3.4 14.2L6.8 11.2"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'sword-summon':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Conjured Necrosword with emerald glow */}
          <path
            d="M19.8 3.6L16.8 9.8L13.8 10.6L11.2 13.4L10.6 16L8.2 15.4L5.2 18.8L4 17.6L7.4 14.6L6.8 12.2L9.4 11.6L12.2 9L13 6L19.8 3.6Z"
            fill="#283536"
            stroke="#3CE66B"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M18.6 4.8L11.2 12.2"
            stroke="#98FFB4"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'green-explosion':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Emerald energy burst */}
          <circle
            cx="12"
            cy="12"
            r="8.1"
            stroke="#3CE66B"
            strokeWidth="2.1"
            strokeDasharray="4.5 2.4"
          />
          <circle
            cx="12"
            cy="12"
            r="4.2"
            fill="#26C458"
            stroke="#FFFFFF"
            strokeWidth="1.6"
          />
          <path
            d="M12 2.4V5.2M12 18.8V21.6M2.4 12H5.2M18.8 12H21.6"
            stroke="#B9FFD0"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'spinning-leap':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Spiral aerial leap arrow */}
          <path
            d="M6.2 18.5C5.2 14.6 8.2 11.6 12.6 11.6C16.2 11.6 18.4 13.6 18.2 16"
            stroke="#3CE66B"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M12 4.2L16.5 9.2H13.4V15.4H10.6V9.2H7.5L12 4.2Z"
            fill="#FFFFFF"
            stroke="#0B0D18"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'ground-sword':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Giant Necrosword erupting up from earth */}
          <path
            d="M12 2.8L15.4 9.5L13.9 10.6L14.5 18.4H9.5L10.1 10.6L8.6 9.5L12 2.8Z"
            fill="#1D2628"
            stroke="#3CE66B"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M4.2 19.6H19.8M6.2 17.5L8.6 19.6M17.8 17.5L15.4 19.6"
            stroke="#B4FFD0"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'crown-form':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Hela's 6-pronged obsidian & emerald antlered crown */}
          <path
            d="M3.2 7.2L8.4 13.6L6.6 5.4L10.6 12.4L12 4.2L13.4 12.4L17.4 5.4L15.6 13.6L20.8 7.2L17.8 17.4C15.8 18.6 14 19.2 12 19.2C10 19.2 8.2 18.6 6.2 17.4L3.2 7.2Z"
            fill="#1D2628"
            stroke="#3CE66B"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="15.8" r="1.6" fill="#3CE66B" />
        </svg>
      );

    case 'throw-sword':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Flying angled Necrosword with speed lines */}
          <path
            d="M20.6 4.4L15.4 12.6L12.6 12.4L11 14.8L8.8 13.2L11.2 11.4L11 8.6L20.6 4.4Z"
            fill="#1D2628"
            stroke="#3CE66B"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M3.4 18.6L8.2 15.2M3.2 13.6L6.8 11.6M6.8 20.6L10 17.6"
            stroke="#B4FFD0"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'sword-slash':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Dual Necrosword slash arc */}
          <path
            d="M4.2 16.5C8.5 9.2 14.6 5.2 20.4 4.2"
            stroke="#98FFB4"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M19.8 4.2L13.8 10.8L11.8 11.2L8.4 15L6.8 13.4L10.6 10L11 8L19.8 4.2Z"
            fill="#1D2628"
            stroke="#3CE66B"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M5.2 5.4L18.6 18.8"
            stroke="#3CE66B"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'magneto-flight':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 10V15C7 17.8 9.2 20 12 20C14.8 20 17 17.8 17 15V10"
            stroke="#D26BFF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path d="M12 3.5L16.2 8.2H13.4V13.8H10.6V8.2H7.8L12 3.5Z" fill="#FFFFFF" stroke="#0B0D18" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );

    case 'metal-projectile':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19.8 4.4L14.5 14.5L9.2 13L7.8 8L19.8 4.4Z" fill="#C4CCD8" stroke="#0B0D18" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M3.5 19L9.2 14.2M4.5 13.5L8.2 11.4" stroke="#D26BFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'magnetic-meteor':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12.5" cy="11.5" r="6" fill="#9AA4B4" stroke="#D26BFF" strokeWidth="1.9" />
          <path d="M6.8 6.8L10.2 9.2M16.4 5.2L14.2 8.6M6 15.8L9.6 14M18 16.5L15 14.4" stroke="#E4A8FF" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );


    case 'metal-tornado':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4.5 6.5H19.5M6.5 10.2H17.5M8.5 14H15.5M10.4 17.6H13.6" stroke="#C8D0DC" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M7.2 4.4L5.2 9.4L9 10.6L6.6 19.2" stroke="#D26BFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'super-speed':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M14.2 3L6.4 13H12L10.2 21L18.2 10.8H12.6L14.2 3Z" fill={qsPrimary} stroke="#0B0D18" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M3.2 8.5H7.2M2.6 15.2H6.4" stroke={qsLight} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'rapid-punch-combo':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M10.5 7.2H17.8C19.2 7.2 20.2 8.2 20.2 9.6V13.6C20.2 15 19.2 16 17.8 16H11.2L8.8 13.8V9.2L10.5 7.2Z" fill={qsPrimary} stroke="#0B0D18" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M3.2 9H7.2M2.4 12H7M3.4 15H7.2" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'speed-blitz':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 16.5L8.4 7.2L12.6 12.6L18.8 5.2"
            stroke="#4DFF9E"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="17.6" cy="14.2" r="3.6" fill="#4DFF9E" stroke="#0B0D18" strokeWidth="1.5" />
          <path
            d="M15.6 14.2H19.6M17.6 12.2V16.2"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M4.2 11.4H7.2M8.8 18.4H12.2"
            stroke="#B6FFD8"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'wind-tornado':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4.2 6.4C8.4 5.2 15.6 5.2 19.8 6.4M6 10.2C9.2 9.2 14.8 9.2 18 10.2M8.2 14C10.5 13.2 13.5 13.2 15.8 14M10.4 17.8H13.6" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M17.5 12.2L19.8 14.5M4.5 13.8L7.2 15.8" stroke={qsPrimary} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'time-stop':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8.2" fill={qsPrimary} fillOpacity="0.28" stroke={qsPrimary} strokeWidth="2" />
          <path d="M12 7.2V12.2L15.4 14.2" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'cloak-flight':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7.5 5.2L12 8.2L16.5 5.2L19.2 17.5C15 19.2 9 19.2 4.8 17.5L7.5 5.2Z" fill="#E63B3B" stroke="#FF9D3B" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M12 8.4V17.4" stroke="#FFD678" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'mystic-shield':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8.4" stroke="#FF9D3B" strokeWidth="2" />
          <rect x="7.4" y="7.4" width="9.2" height="9.2" stroke="#FFD480" strokeWidth="1.5" transform="rotate(45 12 12)" />
          <circle cx="12" cy="12" r="3" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>
      );

    case 'mystic-clones':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="7.2" cy="7.5" r="2.2" fill="#FF9D3B" stroke="#0B0D18" strokeWidth="1.3" />
          <circle cx="16.8" cy="7.5" r="2.2" fill="#FF9D3B" stroke="#0B0D18" strokeWidth="1.3" />
          <circle cx="12" cy="15.8" r="2.5" fill="#FFFFFF" stroke="#FF9D3B" strokeWidth="1.5" />
          <path d="M9 8.8L15 8.8M8.2 9.4L10.8 14M15.8 9.4L13.2 14" stroke="#FFD27A" strokeWidth="1.7" strokeDasharray="2.2 1.8" strokeLinecap="round" />
        </svg>
      );

    case 'eldritch-discs':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {/* Flat horizontal orange eldritch disc + speed sparks */}
          <ellipse cx="12" cy="12" rx="9.2" ry="3.2" fill="#FF9D3B" fillOpacity="0.28" stroke="#FF9D3B" strokeWidth="1.9" />
          <ellipse cx="12" cy="12" rx="5.4" ry="1.8" stroke="#FFE29A" strokeWidth="1.5" />
          <path d="M3.5 8.2L6.8 9.2M17.2 14.8L20.5 15.8M5.2 15.6L7.6 14.6" stroke="#FFD166" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );

    case 'astral-extraction':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {/* Physical body silhouette + separating cyan-gold astral soul */}
          <circle cx="8.2" cy="7.2" r="2.4" fill="#E8A938" stroke="#0B0D18" strokeWidth="1.3" />
          <path d="M4.6 18.6C4.6 14.4 6.2 12.2 8.2 12.2C10.2 12.2 11.8 14.4 11.8 18.6Z" fill="#E8A938" stroke="#0B0D18" strokeWidth="1.3" />
          <circle cx="15.8" cy="6.2" r="2.4" fill="#7CE4FF" fillOpacity="0.72" stroke="#FFFFFF" strokeWidth="1.3" />
          <path d="M12.4 17.4C12.4 13.4 14 11.2 15.8 11.2C17.6 11.2 19.2 13.4 19.2 17.4Z" fill="#7CE4FF" fillOpacity="0.62" stroke="#FFFFFF" strokeWidth="1.3" strokeDasharray="2.2 1.4" />
          <path d="M10.4 10.6L13.6 9.6" stroke="#FFB84D" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'phoenix-dive':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4.2 14.8C7.6 9.2 11.2 6.2 15.4 4.2L19.6 8.4C17.6 12.6 14.6 16.2 9 19.6L10.6 15.2L4.2 14.8Z"
            fill="#FF981A"
            stroke="#0B0D18"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M15.6 15.2L19.8 19.4M19.8 15.8V19.4H16.2"
            stroke="#FFF1A8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'vision-flight':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3.8L16.6 9.4H13.5V16.8H10.5V9.4H7.4L12 3.8Z" fill="#FFD84D" stroke="#0B0D18" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M5.4 18.8C7.4 16.8 9.5 16 12 16C14.5 16 16.6 16.8 18.6 18.8" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );

    case 'intangibility':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="7.2" r="2.8" fill="#FFD84D" fillOpacity="0.65" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2.5 1.5" />
          <path d="M7.6 12.2H16.4L15.4 19.4H8.6L7.6 12.2Z" fill="#FFD84D" fillOpacity="0.55" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2.8 1.6" strokeLinejoin="round" />
        </svg>
      );

    case 'mind-stone-laser':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5.2 6.8L8.4 11.4L5.2 16L2.4 11.4L5.2 6.8Z" fill="#FFD84D" stroke="#0B0D18" strokeWidth="1.4" />
          <path d="M8.8 11.4H21" stroke="#FFE97D" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M8.8 11.4H21" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );

    case 'mind-stone-projectile':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19.8 5.2L13.4 13.8L9.6 10.6L19.8 5.2Z" fill="#FFD84D" stroke="#0B0D18" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M4.2 18.6L9.4 13.8M3.6 13.4L7.4 11" stroke="#FFF29C" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'head-grip':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="11.5" r="4.4" fill="#FFD84D" fillOpacity="0.35" stroke="#FFD84D" strokeWidth="1.8" />
          <path d="M4.8 9.2L8.2 11.2M19.2 9.2L15.8 11.2M7.2 18.2L9.8 15.2M16.8 18.2L14.2 15.2" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );

    case 'chaos-drain':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="5.2" cy="12" r="2.6" fill="#FF3B5C" stroke="#FFFFFF" strokeWidth="1.4" />
          <path
            d="M7.6 10.6L20.8 5.4V18.6L7.6 13.4Z"
            fill="#9E0B22"
            fillOpacity="0.72"
            stroke="#FF5270"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M8.5 12H19.4" stroke="#FFD0D8" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );

    case 'zombie-beam':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="4.8" cy="12" r="2.5" fill="#B80C1C" stroke="#FF6B7B" strokeWidth="1.4" />
          <path
            d="M7.2 10.2L21 4.8V19.2L7.2 13.8Z"
            fill="#6E0410"
            fillOpacity="0.82"
            stroke="#FF3B4E"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M9 9.5L17.5 8M9 14.5L17.5 16" stroke="#FFB8C0" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );

    case 'zombie-stone-explosion':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="#9E0B1C" stroke="#FF4A5C" strokeWidth="1.8" />
          <path d="M5.2 6.8L8.2 5.2L9.2 8L6.2 9.4Z" fill="#7D7A84" stroke="#0B0D18" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M15.4 4.8L18.6 6.2L17.6 9.2L14.4 7.8Z" fill="#7D7A84" stroke="#0B0D18" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M15.8 15.2L19.2 16.4L17.8 19.4L14.8 17.8Z" fill="#7D7A84" stroke="#0B0D18" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M4.8 16.4L8.2 15.2L9.2 18L5.8 19.4Z" fill="#7D7A84" stroke="#0B0D18" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      );

    case 'agatha-flight':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3.8L16.6 9.6H13.5V16.2H10.5V9.6H7.4L12 3.8Z" fill="#D57EFF" stroke="#0B0D18" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M5.4 18.6C7.6 16.8 9.8 16 12 16C14.2 16 16.4 16.8 18.6 18.6" stroke="#F0CCFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'agatha-bolt':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="14.6" cy="9.4" r="4.8" fill="#9A2EFF" stroke="#0B0D18" strokeWidth="1.6" />
          <circle cx="14.6" cy="9.4" r="2.1" fill="#F2CEFF" />
          <path d="M4.2 19.2L10.2 13.6M4 13.6L8.2 10.8" stroke="#C86BFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'agatha-darkhold':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 6.2C3 5.3 3.7 4.7 4.6 4.8L11.4 6.2V19.6L4.2 18.2C3.5 18 3 17.4 3 16.7V6.2Z"
            fill="#34124F"
            stroke="#0B0D18"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M21 6.2C21 5.3 20.3 4.7 19.4 4.8L12.6 6.2V19.6L19.8 18.2C20.5 18 21 17.4 21 16.7V6.2Z"
            fill="#34124F"
            stroke="#0B0D18"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M4.6 6.6L10.8 7.8V17.8L4.6 16.6V6.6Z"
            fill="#EADDF5"
            stroke="#0B0D18"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path
            d="M19.4 6.6L13.2 7.8V17.8L19.4 16.6V6.6Z"
            fill="#D8C2EC"
            stroke="#0B0D18"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3.4" fill="#A855F7" stroke="#0B0D18" strokeWidth="1.2" />
          <path
            d="M12 7.3L13.1 10.6L16.5 10.6L13.8 12.6L14.8 15.9L12 13.9L9.2 15.9L10.2 12.6L7.5 10.6L10.9 10.6Z"
            fill="#F5E8FF"
          />
        </svg>
      );

    case 'agatha-teleport':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8.2" stroke="#C084FC" strokeWidth="2.1" strokeDasharray="4 2.5" />
          <path
            d="M7.5 14.5L13.5 8.5M13.5 8.5H9.2M13.5 8.5V12.8"
            stroke="#FFFFFF"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16.8" cy="16.4" r="2.2" fill="#E9D5FF" stroke="#0B0D18" strokeWidth="1.3" />
        </svg>
      );

    case 'agatha-darkhold-blast':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="7.8" stroke="#C084FC" strokeWidth="2.1" strokeDasharray="4.5 2.4" />
          <circle cx="12" cy="12" r="3.8" fill="#9333EA" stroke="#F5E8FF" strokeWidth="1.7" />
          <path
            d="M12 2.4V5.2M12 18.8V21.6M2.4 12H5.2M18.8 12H21.6M5 5L7.1 7.1M16.9 16.9L19 19M19 5L16.9 7.1M7.1 16.9L5 19"
            stroke="#F5E8FF"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'agatha-auto-shield':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2.8L19.4 5.8V11.6C19.4 16.3 16.2 19.9 12 21.4C7.8 19.9 4.6 16.3 4.6 11.6V5.8L12 2.8Z"
            fill="#7E22CE"
            stroke="#0B0D18"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M12 5.4L16.8 7.4V11.4C16.8 14.7 14.7 17.3 12 18.5C9.3 17.3 7.2 14.7 7.2 11.4V7.4L12 5.4Z"
            fill="#C084FC"
            stroke="#FFFFFF"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="11.6" r="2.2" fill="#FFFFFF" />
        </svg>
      );

    case 'agatha-shield':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <ellipse cx="12" cy="12" rx="8.6" ry="5.2" stroke="#D57EFF" strokeWidth="2" />
          <circle cx="12" cy="12" r="3.2" fill="#8A24D6" stroke="#F4D4FF" strokeWidth="1.5" />
          <path d="M4.8 8.4C7 6.4 17 6.4 19.2 8.4" stroke="#BA5AFF" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );

    case 'purgatory-grasp':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <ellipse cx="12" cy="17.8" rx="8.2" ry="2.6" fill="#2563EB" fillOpacity="0.45" stroke="#8CE8FF" strokeWidth="1.8" />
          <path d="M8.2 17V6.2M15.8 17V6.2M12 17.5V4.4" stroke="#9BEBFF" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9.4 7.4L12 4.2L14.6 7.4" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'invisible-flight':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <ellipse cx="12" cy="17.2" rx="8.8" ry="3.2" fill="#38BDF8" fillOpacity="0.32" stroke="#BCEBFF" strokeWidth="1.8" />
          <ellipse cx="12" cy="17.2" rx="4.4" ry="1.4" stroke="#7DD3FC" strokeWidth="1.3" />
          <path d="M12 4.2V13.4M8.8 7.8L12 4.2L15.2 7.8" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'invisibility':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="6.6" r="2.7" stroke="#A5E8FF" strokeWidth="1.7" strokeDasharray="2.2 1.8" />
          <path
            d="M7.6 19.6V14.2C7.6 11.8 9.6 10.4 12 10.4C14.4 10.4 16.4 11.8 16.4 14.2V19.6"
            stroke="#56D4FF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="2.5 2"
          />
          <path
            d="M4.6 10.2H7.2M16.8 13.6H19.4M5.4 16.2H8.2"
            stroke="#E0F7FF"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'forcefield-shield':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8.6" fill="#2294FF" fillOpacity="0.28" stroke="#BCEBFF" strokeWidth="2" />
          <path d="M7.2 8.2C9.2 6 14.8 6 16.8 8.2" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3.4" fill="#38BDF8" fillOpacity="0.55" stroke="#E0F7FF" strokeWidth="1.4" />
        </svg>
      );

    case 'forcefield-barrier':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <ellipse cx="14.2" cy="12" rx="7.2" ry="3.2" transform="rotate(-14 14.2 12)" fill="#38BDF8" fillOpacity="0.45" stroke="#D4F3FF" strokeWidth="1.9" />
          <path d="M3.2 13.8L8.2 12.6M4.4 10.2L9.2 9.4" stroke="#9BEBFF" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'forcefield-transfer':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="6.8" cy="12" r="3.8" fill="#38BDF8" fillOpacity="0.4" stroke="#BCEBFF" strokeWidth="1.7" />
          <circle cx="17.2" cy="12" r="3.8" fill="#38BDF8" fillOpacity="0.4" stroke="#BCEBFF" strokeWidth="1.7" />
          <path d="M10.4 9.8H14.8M13.2 8.2L15.2 9.8L13.2 11.4" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.6 14.2H9.2M10.8 12.6L8.8 14.2L10.8 15.8" stroke="#7DD3FC" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'forcefield-protection':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8.4" fill="#2294FF" fillOpacity="0.28" stroke="#7CE8FF" strokeWidth="1.9" />
          <path d="M12 7.8V16.2M7.8 12H16.2" stroke="#6EFFB8" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );

    case 'forcefield-suffocation':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="5.6" fill="#2563EB" fillOpacity="0.46" stroke="#7DD3FC" strokeWidth="1.9" />
          <path d="M4.2 4.2L8.4 8.4M19.8 4.2L15.6 8.4M4.2 19.8L8.4 15.6M19.8 19.8L15.6 15.6" stroke="#FF708D" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );

    case 'vampire-flight':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M19.5 6.2L12.6 11.4L10.2 8.8L4.2 14.5"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14.4 5.8L19.8 6L18.4 11.2"
            stroke="#F4C430"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3.8 18.2H13.4M6.2 20.6H16.2"
            stroke="#FFFFFF"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'ground-stomp':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3.2V13.8M8.4 10.6L12 14.6L15.6 10.6"
            stroke="#F4C430"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse
            cx="12"
            cy="18.2"
            rx="8.4"
            ry="2.6"
            fill="#F4C430"
            fillOpacity="0.3"
            stroke="#FFFFFF"
            strokeWidth="1.8"
          />
          <path
            d="M4.4 14.8L6.6 16.4M19.6 14.8L17.4 16.4"
            stroke="#3CE872"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'vampire-bolt':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle
            cx="14.2"
            cy="12"
            r="5.6"
            fill="#FACC15"
            stroke="#0B0D18"
            strokeWidth="1.6"
          />
          <circle cx="14.2" cy="12" r="2.6" fill="#FFFBEB" />
          <path
            d="M3.2 9.4H8.6M2.2 12H7.6M4.2 14.6H9.2"
            stroke="#FDE047"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'power-absorption':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="6.2" cy="12" r="3.4" fill="#3CE872" stroke="#0B0D18" strokeWidth="1.5" />
          <circle cx="17.8" cy="12" r="3.4" fill="#F4C430" stroke="#0B0D18" strokeWidth="1.5" />
          <path
            d="M14.2 9.8C12.2 8.2 10.8 11.4 9.6 12C8.8 12.4 10.6 14.8 14.2 14.2"
            stroke="#FFE566"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M11.6 10.2L9.4 12L11.6 13.8"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'stolen-ability':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9.1 9.1C9.1 7.2 10.4 5.9 12.2 5.9C13.9 5.9 15.2 7.1 15.2 8.7C15.2 10.1 14.1 10.9 12.9 11.7C12.1 12.2 11.8 12.8 11.8 13.9V14.5"
            stroke="#E2E8F0"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="11.9" cy="18.1" r="1.45" fill="#E2E8F0" />
        </svg>
      );

    case 'bandit-gun':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3.4 9.2H15.8V12.6H11.6L10.2 17.8H6.8L8.1 12.6H3.4V9.2Z"
            fill="#CBD5E1"
            stroke="#0B0D18"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M17.2 10.9H21.2M18.6 8.3L20.4 7M18.6 13.5L20.4 14.8"
            stroke="#FFD147"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'prisoner-punch':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9.4 7.4H16.8C18.4 7.4 19.6 8.6 19.6 10.2V13.8C19.6 15.4 18.4 16.6 16.8 16.6H10.2L7.8 14.2V9.6L9.4 7.4Z"
            fill="#FF9F43"
            stroke="#0B0D18"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M3.2 9.2H6.4M2.4 12H6.2M3.4 14.8H6.4"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'shield-throw':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="13.5" cy="11.5" r="7.2" fill="#EF4444" stroke="#0B0D18" strokeWidth="1.5" />
          <circle cx="13.5" cy="11.5" r="5.1" fill="#F8FAFC" />
          <circle cx="13.5" cy="11.5" r="3.2" fill="#3B82F6" />
          <path
            d="M13.5 9.1L14.2 10.6L15.9 10.8L14.6 11.9L15 13.6L13.5 12.7L12 13.6L12.4 11.9L11.1 10.8L12.8 10.6L13.5 9.1Z"
            fill="#FFFFFF"
          />
          <path
            d="M2.6 14.2C4.2 17 7.6 19.2 11.4 19.6"
            stroke="#93C5FD"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M2.4 9.8H5.4"
            stroke="#BAE6FD"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'shield-defense':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3L19.5 6.4V12.2C19.5 16.7 16.2 20.1 12 21.5C7.8 20.1 4.5 16.7 4.5 12.2V6.4L12 3Z"
            fill="#2563EB"
            stroke="#0B0D18"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="4.8" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.2" />
          <circle cx="12" cy="12" r="2.6" fill="#3B82F6" />
          <path
            d="M12 9.9L12.6 11.2L14 11.4L13 12.4L13.2 13.8L12 13.1L10.8 13.8L11 12.4L10 11.4L11.4 11.2L12 9.9Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'shield-combo':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="8.6" cy="13.2" r="5.6" fill="#EF4444" stroke="#0B0D18" strokeWidth="1.5" />
          <circle cx="8.6" cy="13.2" r="3.6" fill="#F8FAFC" />
          <circle cx="8.6" cy="13.2" r="2.0" fill="#2563EB" />
          <path
            d="M14.2 5.4H19.4L21 8.4L17.4 11.6L14.2 9.4V5.4Z"
            fill="#DC2626"
            stroke="#0B0D18"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M15.4 16.2L19.8 13.4M16.5 18.8L20.8 16.5"
            stroke="#93C5FD"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'shield-charge':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M2.5 8.5H8.5M2 12H7.5M2.5 15.5H8.5"
            stroke="#BAE6FD"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <ellipse cx="14.5" cy="12" rx="5.5" ry="7.4" fill="#EF4444" stroke="#0B0D18" strokeWidth="1.6" />
          <ellipse cx="14.5" cy="12" rx="3.7" ry="5.1" fill="#F8FAFC" />
          <ellipse cx="14.5" cy="12" rx="2.1" ry="3.0" fill="#2563EB" />
          <path
            d="M17.2 4.4L21.5 12L17.2 19.6"
            stroke="#60A5FA"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'mjolnir-combo':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7.5 4.8L16.5 4.8L18 7.5V11.2L16.5 12.6H7.5L6 11.2V7.5L7.5 4.8Z"
            fill="#94A3B8"
            stroke="#0B0D18"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <rect x="10.8" y="12.5" width="2.4" height="7.5" rx="0.9" fill="#78350F" stroke="#0B0D18" strokeWidth="1.3" />
          <path
            d="M3.2 11.5L5.2 9.4M20.8 9.2L18.8 11.6M4.2 16.2L8.4 15.2"
            stroke="#56D4FF"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'mjolnir-throw':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <g transform="rotate(28 14 10)">
            <rect x="9.5" y="4.8" width="9" height="6.2" rx="1.2" fill="#CBD5E1" stroke="#0B0D18" strokeWidth="1.6" />
            <rect x="13" y="11" width="2.2" height="6.6" rx="0.8" fill="#78350F" stroke="#0B0D18" strokeWidth="1.2" />
          </g>
          <path
            d="M2.5 15.5L8.2 13M3.2 18.8L10.5 15.8"
            stroke="#7CE4FF"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M17.5 5.2L19.8 3.2L18.8 6.4L21.4 6.8L18.4 9.2"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'lightning-slam':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M13.5 2.5L7.6 11.4H12.2L10.4 17.5L16.8 9.2H12.4L13.5 2.5Z"
            fill="#56D4FF"
            stroke="#0B0D18"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <ellipse cx="12" cy="19.6" rx="8.6" ry="2.4" stroke="#7CE4FF" strokeWidth="2" />
          <path
            d="M4.2 14.5L6.5 17.2M19.8 14.5L17.5 17.2"
            stroke="#BAE6FD"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'lightning-storm-beam':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="5.2" cy="12" r="2.8" fill="#E0F2FE" stroke="#0B0D18" strokeWidth="1.4" />
          <path
            d="M7.5 12L11.2 9.4L14.4 14.2L17.8 9.8L21.5 12"
            stroke="#56D4FF"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 12L11.2 9.4L14.4 14.2L17.8 9.8L21.5 12"
            stroke="#FFFFFF"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12.5 8.8L14.6 5.2M15.4 14.8L17.8 18.4"
            stroke="#7CE4FF"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'cosmic-flight':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 16.5C7 11.5 13 8 21 6.5C18.5 12 13 16.5 6.5 18.2L3 16.5Z"
            fill="#E2E8F0"
            stroke="#0B0D18"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M6.5 16L17.5 8.8"
            stroke="#7CE4FF"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M3.5 19.8H11M5 21.6H9.5"
            stroke="#BAE6FD"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'damage-absorption':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3.2L19 6.2V11.8C19 16.2 15.8 19.6 12 21C8.2 19.6 5 16.2 5 11.8V6.2L12 3.2Z"
            fill="#94A3B8"
            fillOpacity="0.45"
            stroke="#E2E8F0"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M12.8 6.8L9.6 12H12.4L11.2 17.2L14.8 11.6H12.2L12.8 6.8Z"
            fill="#E0F2FE"
            stroke="#0B0D18"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'sonic-blast':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <ellipse
            cx="15.5"
            cy="12"
            rx="4.2"
            ry="7.5"
            fill="#E2E8F0"
            fillOpacity="0.22"
            stroke="#F8FAFC"
            strokeWidth="2.1"
          />
          <ellipse cx="10.2" cy="12" rx="2.6" ry="5.0" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 2" />
          <path
            d="M2.5 8.5H9.5M3.5 12H11.5M2.8 15.5H9.8"
            stroke="#BAE6FD"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'cosmic-blast':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="14.5" cy="9.5" r="5.5" fill="#E0F2FE" stroke="#0B0D18" strokeWidth="1.6" />
          <circle cx="14.5" cy="9.5" r="2.7" fill="#FFFFFF" />
          <path
            d="M3.5 18.5L10.5 12.8M5.8 20.5L12.2 15.2"
            stroke="#7CE4FF"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'dual-cosmic-beam':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 6.5L18.5 12M3 17.5L18.5 12"
            stroke="#7CE4FF"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M3 6.5L18.5 12M3 17.5L18.5 12"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="19" cy="12" r="3.4" fill="#E0F2FE" stroke="#0B0D18" strokeWidth="1.3" />
          <circle cx="19" cy="12" r="1.5" fill="#FFFFFF" />
        </svg>
      );

    case 'storm-flight':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3.5 9.5C7 6.5 13.5 6.8 18 9.2C20.2 10.4 20.2 13 17.5 13H5"
            stroke="#E0F2FE"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M4.5 15.8H16.5C18.8 15.8 19.2 18.8 16.5 19.2C14.8 19.5 14 18.4 14 18.4"
            stroke="#7CE4FF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="19" cy="6.2" r="1.4" fill="#FFFFFF" />
        </svg>
      );

    case 'lightning-strike':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M14.2 2.5L6.5 12.6H11.8L9.6 21.5L18 10.8H12.6L14.2 2.5Z"
            fill="#FEF08A"
            stroke="#0B0D18"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M13.3 5.2L9.2 11.4H12.5L11.2 17.2"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'storm-tornado':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <ellipse cx="12" cy="5.5" rx="8.2" ry="2.2" fill="#BAE6FD" stroke="#0B0D18" strokeWidth="1.4" />
          <path
            d="M5.2 9.4C7.2 10.8 16.8 10.8 18.8 9.4M7.2 13.4C9 14.6 15 14.6 16.8 13.4M9.4 17.4C10.6 18.2 13.4 18.2 14.6 17.4"
            stroke="#E0F2FE"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path d="M11.2 20.8H12.8" stroke="#7CE4FF" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'ice-spear':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M19.8 4.2L14.5 13.2L10.8 9.5L19.8 4.2Z"
            fill="#BAE6FD"
            stroke="#0B0D18"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M10.8 9.5L4.2 19.8L14.5 13.2L10.8 9.5Z"
            fill="#67E8F9"
            stroke="#0B0D18"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M6.5 6.2L8.4 8.1M16.4 16.8L18.4 18.8"
            stroke="#E0F2FE"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'wind-blast':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 8.5H15.5C17.8 8.5 18.5 5.4 15.8 5C14.2 4.8 13.4 5.9 13.4 5.9"
            stroke="#E0F2FE"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M2.5 12.5H19.5C21.5 12.5 21.8 15.6 19.2 15.8C17.6 16 17 14.8 17 14.8"
            stroke="#7CE4FF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M4.5 16.8H13.2M17.6 6.2L19.4 4.8M19.2 18.6L21 17.2"
            stroke="#86EFAC"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
  }
});

/**
 * Unit Tests for File Parser
 *
 * Tests parsing of media filenames for movies, series, music, and books.
 */

import { describe, it, expect } from 'vitest';
import {
  parseFilename,
  isMediaFile,
  isVideoFile,
  isAudioFile,
  isBookFile,
} from './fileParser.js';

describe('fileParser', () => {
  describe('parseFilename - Movies', () => {
    it('parses standard movie format with year and quality', () => {
      const result = parseFilename('Inception.2010.1080p.BluRay.x265.mkv');

      expect(result.type).toBe('movie');
      expect(result.title).toBe('Inception');
      expect(result.year).toBe(2010);
      expect(result.quality).toBe('1080p');
      expect(result.source).toBe('BluRay');
      expect(result.codec).toBe('x265');
      expect(result.extension).toBe('.mkv');
    });

    it('parses movie with spaces in title', () => {
      const result = parseFilename(
        'The.Dark.Knight.Rises.2012.2160p.WEB-DL.x264.mp4'
      );

      expect(result.type).toBe('movie');
      expect(result.title).toBe('The Dark Knight Rises');
      expect(result.year).toBe(2012);
      expect(result.quality).toBe('2160p');
      expect(result.source).toBe('WEB-DL');
      expect(result.codec).toBe('x264');
    });

    it('parses movie without year', () => {
      const result = parseFilename('Some.Movie.720p.HDTV.mkv');

      expect(result.type).toBe('movie');
      expect(result.title).toBe('Some Movie');
      expect(result.year).toBeUndefined();
      expect(result.quality).toBe('720p');
      expect(result.source).toBe('HDTV');
    });

    it('parses movie with 4K quality tag', () => {
      const result = parseFilename('Avatar.2009.4K.REMUX.mkv');

      expect(result.type).toBe('movie');
      expect(result.title).toBe('Avatar');
      expect(result.year).toBe(2009);
      expect(result.quality).toBe('2160p');
      expect(result.source).toBe('REMUX');
    });

    it('parses movie with parentheses in title', () => {
      const result = parseFilename(
        'Spider-Man.No.Way.Home.2021.1080p.BluRay.mkv'
      );

      expect(result.type).toBe('movie');
      expect(result.title).toBe('Spider-Man No Way Home');
      expect(result.year).toBe(2021);
    });

    it('parses movie with DVDRip source', () => {
      const result = parseFilename('Old.Movie.1995.DVDRip.XviD.avi');

      expect(result.type).toBe('movie');
      expect(result.title).toBe('Old Movie');
      expect(result.year).toBe(1995);
      expect(result.quality).toBe('480p');
      expect(result.source).toBe('DVD');
      expect(result.codec).toBe('XviD');
    });

    it('handles quality info at start of filename', () => {
      const result = parseFilename('720p.Sample.Movie.2020.mkv');

      expect(result.type).toBe('movie');
      // Title extraction should work even when quality is at position 0
      expect(result.quality).toBe('720p');
    });
  });

  describe('parseFilename - Series', () => {
    it('parses standard series format S01E01', () => {
      const result = parseFilename(
        'Breaking.Bad.S01E05.Gray.Matter.720p.BluRay.mkv'
      );

      expect(result.type).toBe('series');
      expect(result.title).toBe('Breaking Bad');
      expect(result.season).toBe(1);
      expect(result.episode).toBe(5);
      expect(result.quality).toBe('720p');
      expect(result.source).toBe('BluRay');
    });

    it('parses series with double-digit season/episode', () => {
      const result = parseFilename(
        'Game.of.Thrones.S08E06.The.Iron.Throne.1080p.WEB-DL.mkv'
      );

      expect(result.type).toBe('series');
      expect(result.title).toBe('Game of Thrones');
      expect(result.season).toBe(8);
      expect(result.episode).toBe(6);
      expect(result.quality).toBe('1080p');
      expect(result.source).toBe('WEB-DL');
    });

    it('parses series with 1x01 format', () => {
      const result = parseFilename('The.Office.1x01.Pilot.720p.HDTV.mkv');

      expect(result.type).toBe('series');
      expect(result.title).toBe('The Office');
      expect(result.season).toBe(1);
      expect(result.episode).toBe(1);
    });

    it('parses series with [1x01] bracket format', () => {
      const result = parseFilename('Friends.[10x17].The.Last.One.480p.mkv');

      expect(result.type).toBe('series');
      expect(result.title).toBe('Friends');
      expect(result.season).toBe(10);
      expect(result.episode).toBe(17);
    });

    it('parses anime with triple-digit episode', () => {
      const result = parseFilename('One.Piece.S01E1015.1080p.WEB-DL.x265.mkv');

      expect(result.type).toBe('series');
      expect(result.title).toBe('One Piece');
      expect(result.season).toBe(1);
      expect(result.episode).toBe(1015);
    });

    it('extracts episode title when present', () => {
      const result = parseFilename(
        'Stranger.Things.S04E09.The.Piggyback.2160p.WEB-DL.mkv'
      );

      expect(result.type).toBe('series');
      expect(result.title).toBe('Stranger Things');
      expect(result.season).toBe(4);
      expect(result.episode).toBe(9);
      // Episode title extraction
      expect(result.episodeTitle).toBe('The Piggyback');
    });

    it('handles series without episode title', () => {
      const result = parseFilename('The.Mandalorian.S03E08.1080p.WEB-DL.mkv');

      expect(result.type).toBe('series');
      expect(result.title).toBe('The Mandalorian');
      expect(result.season).toBe(3);
      expect(result.episode).toBe(8);
    });
  });

  describe('parseFilename - Music', () => {
    it('parses standard music format with artist, album, track', () => {
      const result = parseFilename(
        'Pink Floyd - Dark Side of the Moon - 03 - Time.flac'
      );

      expect(result.type).toBe('music');
      expect(result.artist).toBe('Pink Floyd');
      expect(result.album).toBe('Dark Side of the Moon');
      expect(result.track).toBe(3);
      expect(result.title).toBe('Time');
      expect(result.extension).toBe('.flac');
    });

    it('parses music with artist and title only', () => {
      const result = parseFilename('Queen - Bohemian Rhapsody.mp3');

      expect(result.type).toBe('music');
      expect(result.artist).toBe('Queen');
      expect(result.title).toBe('Bohemian Rhapsody');
      expect(result.extension).toBe('.mp3');
    });

    it('parses music with track number only', () => {
      const result = parseFilename('01 - Introduction.wav');

      expect(result.type).toBe('music');
      expect(result.track).toBe(1);
      expect(result.title).toBe('Introduction');
    });

    it('parses music without separators', () => {
      const result = parseFilename('SomeRandomTrack.ogg');

      expect(result.type).toBe('music');
      expect(result.title).toBe('SomeRandomTrack');
    });

    it('handles various audio formats', () => {
      const formats = [
        '.mp3',
        '.flac',
        '.wav',
        '.aac',
        '.ogg',
        '.m4a',
        '.opus',
      ];

      for (const ext of formats) {
        const result = parseFilename(`test${ext}`);
        expect(result.type).toBe('music');
        expect(result.extension).toBe(ext);
      }
    });
  });

  describe('parseFilename - Books', () => {
    it('parses book with author and title', () => {
      const result = parseFilename('Stephen King - The Stand.epub');

      expect(result.type).toBe('book');
      expect(result.author).toBe('Stephen King');
      expect(result.title).toBe('The Stand');
      expect(result.extension).toBe('.epub');
    });

    it('parses book with title only', () => {
      const result = parseFilename('1984.mobi');

      expect(result.type).toBe('book');
      expect(result.title).toBe('1984');
      expect(result.extension).toBe('.mobi');
    });

    it('parses book with author in parentheses', () => {
      const result = parseFilename(
        'The Great Gatsby (F. Scott Fitzgerald).pdf'
      );

      expect(result.type).toBe('book');
      expect(result.author).toBe('F. Scott Fitzgerald');
      expect(result.title).toBe('The Great Gatsby');
    });

    it('handles various book formats', () => {
      const formats = [
        '.epub',
        '.mobi',
        '.pdf',
        '.azw',
        '.azw3',
        '.cbz',
        '.cbr',
      ];

      for (const ext of formats) {
        const result = parseFilename(`test${ext}`);
        expect(result.type).toBe('book');
        expect(result.extension).toBe(ext);
      }
    });

    it('parses comic book format', () => {
      const result = parseFilename('Batman - Year One.cbz');

      expect(result.type).toBe('book');
      expect(result.author).toBe('Batman');
      expect(result.title).toBe('Year One');
    });
  });

  describe('isMediaFile', () => {
    it('recognizes video files', () => {
      expect(isMediaFile('movie.mkv')).toBe(true);
      expect(isMediaFile('movie.mp4')).toBe(true);
      expect(isMediaFile('movie.avi')).toBe(true);
      expect(isMediaFile('movie.m4v')).toBe(true);
    });

    it('recognizes audio files', () => {
      expect(isMediaFile('song.mp3')).toBe(true);
      expect(isMediaFile('song.flac')).toBe(true);
      expect(isMediaFile('song.wav')).toBe(true);
    });

    it('recognizes book files', () => {
      expect(isMediaFile('book.epub')).toBe(true);
      expect(isMediaFile('book.pdf')).toBe(true);
      expect(isMediaFile('book.mobi')).toBe(true);
    });

    it('rejects non-media files', () => {
      expect(isMediaFile('document.txt')).toBe(false);
      expect(isMediaFile('image.jpg')).toBe(false);
      expect(isMediaFile('script.js')).toBe(false);
      expect(isMediaFile('readme.md')).toBe(false);
    });
  });

  describe('isVideoFile', () => {
    it('returns true for video extensions', () => {
      expect(isVideoFile('movie.mkv')).toBe(true);
      expect(isVideoFile('movie.mp4')).toBe(true);
      expect(isVideoFile('movie.avi')).toBe(true);
      expect(isVideoFile('movie.mov')).toBe(true);
      expect(isVideoFile('movie.wmv')).toBe(true);
      expect(isVideoFile('movie.ts')).toBe(true);
      expect(isVideoFile('movie.m2ts')).toBe(true);
    });

    it('returns false for non-video files', () => {
      expect(isVideoFile('song.mp3')).toBe(false);
      expect(isVideoFile('book.epub')).toBe(false);
    });
  });

  describe('isAudioFile', () => {
    it('returns true for audio extensions', () => {
      expect(isAudioFile('song.mp3')).toBe(true);
      expect(isAudioFile('song.flac')).toBe(true);
      expect(isAudioFile('song.wav')).toBe(true);
      expect(isAudioFile('song.aac')).toBe(true);
      expect(isAudioFile('song.ogg')).toBe(true);
    });

    it('returns false for non-audio files', () => {
      expect(isAudioFile('movie.mkv')).toBe(false);
      expect(isAudioFile('book.epub')).toBe(false);
    });
  });

  describe('isBookFile', () => {
    it('returns true for book extensions', () => {
      expect(isBookFile('book.epub')).toBe(true);
      expect(isBookFile('book.mobi')).toBe(true);
      expect(isBookFile('book.pdf')).toBe(true);
      expect(isBookFile('book.azw3')).toBe(true);
      expect(isBookFile('comic.cbz')).toBe(true);
      expect(isBookFile('comic.cbr')).toBe(true);
    });

    it('returns false for non-book files', () => {
      expect(isBookFile('movie.mkv')).toBe(false);
      expect(isBookFile('song.mp3')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty extension gracefully', () => {
      const result = parseFilename('noextension');

      expect(result.extension).toBe('');
      expect(result.type).toBe('unknown');
    });

    it('handles filename with multiple dots', () => {
      const result = parseFilename(
        'Mr.Robot.S01E01.eps1.0_hellofriend.mov.720p.mkv'
      );

      expect(result.type).toBe('series');
      expect(result.title).toBe('Mr Robot');
      expect(result.season).toBe(1);
      expect(result.episode).toBe(1);
    });

    it('handles underscores in filename', () => {
      const result = parseFilename('The_Matrix_1999_1080p_BluRay.mkv');

      expect(result.type).toBe('movie');
      expect(result.title).toBe('The Matrix');
      expect(result.year).toBe(1999);
    });

    it('handles mixed case extensions', () => {
      expect(isVideoFile('movie.MKV')).toBe(true);
      expect(isAudioFile('song.FLAC')).toBe(true);
      expect(isBookFile('book.EPUB')).toBe(true);
    });

    it('handles release group tags', () => {
      const result = parseFilename(
        'The.Boys.S03E01.1080p.WEB-DL.x265-RARBG.mkv'
      );

      expect(result.type).toBe('series');
      expect(result.title).toBe('The Boys');
      expect(result.codec).toBe('x265');
    });

    it('handles WEBRip source', () => {
      const result = parseFilename('Movie.2023.1080p.WEBRip.mkv');

      expect(result.source).toBe('WEBRip');
    });
  });
});
